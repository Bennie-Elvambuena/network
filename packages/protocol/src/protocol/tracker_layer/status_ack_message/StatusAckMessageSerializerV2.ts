import TrackerMessage from '../TrackerMessage'

import StatusAckMessage from './StatusAckMessage'

import { Serializer } from '../../../Serializer'
import { toStreamID } from '../../../utils/StreamID'

const VERSION = 2

/* eslint-disable class-methods-use-this */
export default class StatusAckMessageSerializerV2 extends Serializer<StatusAckMessage> {
    toArray(statusAckMessage: StatusAckMessage): any[] {
        return [
            VERSION,
            TrackerMessage.TYPES.StatusAckMessage,
            statusAckMessage.requestId,
            statusAckMessage.streamId,
            statusAckMessage.streamPartition
        ]
    }

    fromArray(arr: any[]): StatusAckMessage {
        const [
            version,
            _type,
            requestId,
            streamId,
            streamPartition
        ] = arr

        return new StatusAckMessage({
            version,
            requestId,
            streamId: toStreamID(streamId),
            streamPartition
        })
    }
}

TrackerMessage.registerSerializer(VERSION, TrackerMessage.TYPES.StatusAckMessage, new StatusAckMessageSerializerV2())
