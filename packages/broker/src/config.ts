export interface TrackerRegistry {
    registryAddress: string
    jsonRpcProvider: string
}

export interface NetworkConfig {
    name: string,
    hostname: string,
    port: number,
    advertisedWsUrl: string | null,
    isStorageNode: boolean,
    trackers: string[] | TrackerRegistry,
    location: {
        latitude: number,
        longitude: number,
        country: string,
        city: string
    } | null
}

export interface HttpServerConfig {
    port: number, 
    privateKeyFileName: string | null,
    certFileName: string | null
}

export interface StorageNodeRegistryItem {
    address: string
    url: string
}

export interface Config {
    ethereumPrivateKey: string
    network: NetworkConfig,
    reporting: {
        intervalInSeconds: number,
        streamr: {
            streamId: string
        } | null,
        perNodeMetrics: {
            enabled: boolean
            wsUrl: string | null
            httpUrl: string | null
            intervals: {
                sec: number,
                min: number,
                hour: number,
                day: number
            } | null,
            storageNode: string
        } | null,
    },
    streamrUrl: string,
    streamrAddress: string,
    storageNodeRegistry: StorageNodeRegistryItem[]
    httpServer: HttpServerConfig | null
    plugins: Record<string,any>
    apiAuthentication: {
        keys: string[]
    } | null
}