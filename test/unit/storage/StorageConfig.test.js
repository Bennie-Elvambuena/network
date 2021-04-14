/* eslint-disable no-underscore-dangle, object-curly-newline */
const StorageConfig = require('../../../src/storage/StorageConfig')

describe('StorageConfig', () => {
    let config
    let listener

    beforeEach(() => {
        config = new StorageConfig()
        config._setStreams(new Set(['existing1::0', 'existing2::0', 'existing2::1', 'existing3::0']))
        listener = {
            onStreamAdded: jest.fn(),
            onStreamRemoved: jest.fn()
        }
        config.addChangeListener(listener)
    })

    it('setStreams', () => {
        config._setStreams(new Set(['existing2::0', 'existing3::0', 'new1::0', 'new2::0']))
        expect(listener.onStreamAdded).toBeCalledTimes(2)
        expect(listener.onStreamAdded).toHaveBeenCalledWith({ id: 'new1', partition: 0 })
        expect(listener.onStreamAdded).toHaveBeenCalledWith({ id: 'new2', partition: 0 })
        expect(listener.onStreamRemoved).toBeCalledTimes(2)
        expect(listener.onStreamRemoved).toHaveBeenCalledWith({ id: 'existing1', partition: 0 })
        expect(listener.onStreamRemoved).toHaveBeenCalledWith({ id: 'existing2', partition: 1 })
        expect(config.hasStream({ id: 'new1', partition: 0 })).toBeTruthy()
        expect(config.hasStream({ id: 'existing1', partition: 0 })).toBeFalsy()
        expect(config.hasStream({ id: 'other', partition: 0 })).toBeFalsy()
    })

    it('addStream', () => {
        config._addStreams(new Set(['loremipsum::0', 'foo::0', 'bar::0']))
        expect(listener.onStreamAdded).toBeCalledTimes(3)
        expect(listener.onStreamAdded).toHaveBeenCalledWith({ id: 'loremipsum', partition: 0 })
        expect(listener.onStreamAdded).toHaveBeenCalledWith({ id: 'foo', partition: 0 })
        expect(listener.onStreamAdded).toHaveBeenCalledWith({ id: 'bar', partition: 0 })
    })

    it('removeStreams', () => {
        config._removeStreams(new Set(['existing2::0', 'existing2::1']))
        expect(listener.onStreamRemoved).toBeCalledTimes(2)
        expect(listener.onStreamRemoved).toHaveBeenCalledWith({ id: 'existing2', partition: 0 })
        expect(listener.onStreamRemoved).toHaveBeenCalledWith({ id: 'existing2', partition: 1 })
    })
})
