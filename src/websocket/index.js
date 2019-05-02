const ws = require('ws')

const WebsocketServer = require('./WebsocketServer')

module.exports = ({
    networkNode,
    publisher,
    storage,
    streamFetcher,
    volumeLogger,
    config,
}) => {
    const websocketServer = new WebsocketServer(
        new ws.Server({
            port: config.wsPort,
            path: '/api/v1/ws',
            /**
             * Gracefully reject clients sending invalid headers. Without this change, the connection gets abruptly closed,
             * which makes load balancers such as nginx think the node is not healthy.
             * This blocks ill-behaving clients sending invalid headers, as well as very old websocket implementations
             * using draft 00 protocol version (https://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-00)
             */
            verifyClient: (info, cb) => {
                if (info.req.headers['sec-websocket-key']) {
                    cb(true)
                } else {
                    cb(false, 400, 'Invalid headers on websocket request. Please upgrade your browser or websocket library!')
                }
            },
        }),
        networkNode,
        storage,
        streamFetcher,
        publisher,
        volumeLogger,
    )
    websocketServer.on('listening', () => console.info(`WS adapter listening on ${config.wsPort}`))
    return () => websocketServer.close()
}
