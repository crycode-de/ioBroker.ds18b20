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
  };
}
