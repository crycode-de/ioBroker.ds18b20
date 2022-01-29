/**
 * ioBroker object for a single sensor.
 */
declare interface SensorObject extends ioBroker.StateObject {
  native: {
    address: string;
    factor: number;
    offset: number;
    decimals: number | null;
    interval: number;
    nullOnError: boolean;
    enabled: boolean | undefined;
    sortOrder: number | undefined; // only used in admin
    remoteSystemId: string | null;
  };
}

/**
 * Result of sensor search. (singe sensor)
 */
declare interface SearchedSensor {
  address: string;
  remoteSystemId: string;
}

/**
 * Remote data request/response for client information.
 */
declare interface RemoteDataClientInfo {
  cmd: 'clientInfo';
  protocolVersion: number;
  systemId?: string;
}

/**
 * Remote data request/response for sensor read.
 */
declare interface RemoteDataRead {
  cmd: 'read';
  address: string;
  ts: number;
  raw?: string;
}

/**
 * Remote data request/response for sensor search.
 */
declare interface RemoteDataSearch {
  cmd: 'search';
  ts: number;
  addresses?: string[];
  systemId?: string;
}

/**
 * Remote data request/response for all types.
 */
declare type RemoteData = RemoteDataClientInfo | RemoteDataRead | RemoteDataSearch;
