// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
  namespace ioBroker {

    /**
     * The adapter configuration.
     */
    interface AdapterConfig {
      defaultInterval: number | string;
      remoteEnabled: boolean;
      remoteKey: string;
      remotePort: number;
      w1DevicesPath: string;

      sensors: AdapterConfigSensor[];
    }

    /**
     * A single sensor object in the adapter config.
     */
    interface AdapterConfigSensor {
      address: string;
      remoteSystemId: string;
      name: string;
      interval: number | string | null;
      unit: string;
      factor: number;
      offset: number;
      decimals: number;
      nullOnError: boolean;
      enabled: boolean;
    }

    /**
     * Old adapter config from adapter v1.x.
     * Used for migrations of the old config.
     */
    interface AdapterConfigV1 extends AdapterConfig {
      _values: AdapterConfigV1Values[];
    }

    /**
     * Single entry for `_values` array in adapter config v1.x.
     */
    interface AdapterConfigV1Values extends AdapterConfigSensor {
      sortOrder?: number;
      obj: ioBroker.StateObject;
    }
  }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
