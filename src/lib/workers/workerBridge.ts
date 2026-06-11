// ---------------------------------------------------------------------------
// WorkerBridge — typed wrapper for the parse Web Worker.
// Instantiates with Vite worker syntax; handles message lifecycle.
// ---------------------------------------------------------------------------

import type { Provider, WrappedStats } from "../types";
import type { WorkerInMessage, WorkerOutMessage } from "./parseWorker";

export interface WorkerBridgeCallbacks {
  onProgress: (parsed: number, total: number) => void;
  onResult: (stats: WrappedStats) => void;
  onError: (message: string) => void;
}

export class WorkerBridge {
  private worker: Worker | null = null;

  start(files: File[], provider: Provider, callbacks: WorkerBridgeCallbacks): void {
    this.terminate();

    // Vite module worker syntax — bundled correctly for production
    this.worker = new Worker(
      new URL("./parseWorker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case "progress":
          callbacks.onProgress(msg.parsed, msg.total);
          break;
        case "result":
          callbacks.onResult(msg.stats);
          this.terminate();
          break;
        case "error":
          callbacks.onError(msg.message);
          this.terminate();
          break;
      }
    };

    this.worker.onerror = (e) => {
      callbacks.onError(e.message ?? "Worker error");
      this.terminate();
    };

    const msg: WorkerInMessage = { files, provider };
    this.worker.postMessage(msg);
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
