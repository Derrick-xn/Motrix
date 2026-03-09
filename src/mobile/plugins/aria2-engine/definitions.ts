export interface Aria2EnginePlugin {
  startEngine(options?: {
    rpcPort?: number;
    rpcSecret?: string;
    dir?: string;
    maxConcurrentDownloads?: number;
    maxConnectionPerServer?: number;
    split?: number;
    btTracker?: string;
  }): Promise<{
    started: boolean;
    running?: boolean;
    message?: string;
    pid?: number;
    dir?: string;
  }>;

  stopEngine(): Promise<{ stopped: boolean }>;

  getEngineStatus(): Promise<{ running: boolean; pid: number; dir?: string }>;

  isEngineRunning(): Promise<{ running: boolean }>;
}
