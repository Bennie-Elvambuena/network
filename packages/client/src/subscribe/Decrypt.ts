import { EncryptionType, StreamMessage } from '@streamr/protocol'
import { EncryptionUtil, DecryptError } from '../encryption/EncryptionUtil'
import { StreamRegistryCached } from '../registry/StreamRegistryCached'
import { DestroySignal } from '../DestroySignal'
import { SubscriberKeyExchange } from '../encryption/SubscriberKeyExchange'
import { GroupKeyStore } from '../encryption/GroupKeyStore'
import { ConfigInjectionToken, StrictStreamrClientConfig } from '../Config'
import { inject } from 'tsyringe'
import { GroupKey } from '../encryption/GroupKey'
import { Logger, waitForEvent } from '@streamr/utils'
import { StreamrClientEventEmitter } from '../events'
import { LoggerFactory } from '../utils/LoggerFactory'

export class Decrypt {

    private groupKeyStore: GroupKeyStore
    private keyExchange: SubscriberKeyExchange
    private streamRegistryCached: StreamRegistryCached
    private destroySignal: DestroySignal
    private eventEmitter: StreamrClientEventEmitter
    private config: Pick<StrictStreamrClientConfig, 'decryption'>    
    private readonly logger: Logger

    constructor(
        groupKeyStore: GroupKeyStore,
        keyExchange: SubscriberKeyExchange,
        streamRegistryCached: StreamRegistryCached,
        destroySignal: DestroySignal,
        @inject(LoggerFactory) loggerFactory: LoggerFactory,
        @inject(StreamrClientEventEmitter) eventEmitter: StreamrClientEventEmitter,
        @inject(ConfigInjectionToken) config: Pick<StrictStreamrClientConfig, 'decryption'>
    ) {
        this.groupKeyStore = groupKeyStore
        this.keyExchange = keyExchange
        this.streamRegistryCached = streamRegistryCached
        this.destroySignal = destroySignal
        this.eventEmitter = eventEmitter
        this.config = config
        this.logger = loggerFactory.createLogger(module)
        this.decrypt = this.decrypt.bind(this)
    }

    // TODO if this.destroySignal.isDestroyed() is true, would it make sense to reject the promise
    // and not to return the original encrypted message?
    // - e.g. StoppedError, which is not visible to end-user
    async decrypt(streamMessage: StreamMessage): Promise<StreamMessage> {
        if (this.destroySignal.isDestroyed()) {
            return streamMessage
        }

        if (!streamMessage.groupKeyId) {
            return streamMessage
        }

        if (streamMessage.encryptionType !== EncryptionType.AES) {
            return streamMessage
        }

        try {
            const groupKeyId = streamMessage.groupKeyId!

            let groupKey = await this.groupKeyStore.get(groupKeyId, streamMessage.getStreamId())
            if (groupKey === undefined) {
                await this.keyExchange.requestGroupKey(
                    streamMessage.groupKeyId,
                    streamMessage.getPublisherId(),
                    streamMessage.getStreamPartID()
                )
                try {
                    const groupKeys = await waitForEvent(
                        // TODO remove "as any" type casing in NET-889
                        this.eventEmitter as any,
                        'addGroupKey',
                        this.config.decryption.keyRequestTimeout,
                        (storedGroupKey: GroupKey) => storedGroupKey.id === groupKeyId,
                        this.destroySignal.abortSignal)
                    groupKey = groupKeys[0] as GroupKey
                } catch (e: any) {
                    if (this.destroySignal.isDestroyed()) {
                        return streamMessage
                    }
                    throw new DecryptError(streamMessage, `Could not get GroupKey ${streamMessage.groupKeyId}: ${e.message}`)
                }
                if (this.destroySignal.isDestroyed()) {
                    return streamMessage
                }
            }

            const clone = StreamMessage.deserialize(streamMessage.serialize())
            EncryptionUtil.decryptStreamMessage(clone, groupKey!)
            if (streamMessage.newGroupKey) {
                // newGroupKey has been converted into GroupKey
                await this.groupKeyStore.add(clone.newGroupKey as unknown as GroupKey, streamMessage.getStreamId())
            }
            return clone
        } catch (err) {
            this.logger.debug('failed to decrypt message %j, reason: %s', streamMessage.getMessageID(), err)
            // clear cached permissions if cannot decrypt, likely permissions need updating
            this.streamRegistryCached.clearStream(streamMessage.getStreamId())
            throw err
        }
    }
}
