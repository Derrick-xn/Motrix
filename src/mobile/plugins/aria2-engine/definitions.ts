export interface Aria2EnginePlugin {
  startEngine(options?: {
    rpcPort?: number;
    rpcSecret?: string;
    dir?: string;
    maxConcurrentDownloads?: number;
    maxConnectionPerServer?: number;
  }): Promise<{ started: boolean; message?: string; pid?: number }>;

  stopEngine(): Promise<{ stopped: boolean }>;

  getEngineStatus(): Promise<{ running: boolean; pid: number }>;

  isEngineRunning(): Promise<{ running: boolean }>;
}
