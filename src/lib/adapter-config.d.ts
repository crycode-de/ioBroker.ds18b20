// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
  namespace ioBroker {
    interface AdapterConfig {
      defaultInterval: number;
      remoteEnabled: boolean;
      remoteKey: string;
      remotePort: number;
      w1DevicesPath: string;
    }
  }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
