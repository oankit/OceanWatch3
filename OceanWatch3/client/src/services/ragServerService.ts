import { Service } from "@/lib/serviceRoot";

export interface RAGServerStatus {
  isRunning: boolean;
  isStarting: boolean;
  error?: string;
  port: number;
  startupTime?: number;
}

export interface RAGServerStartResponse {
  success: boolean;
  message: string;
  port: number;
  pid?: number;
  error?: string;
}

class RAGServerService extends Service {
  constructor() {
    super("/api"); // Next.js API routes
  }

  async startServer(): Promise<RAGServerStartResponse> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<RAGServerStartResponse>(() =>
      this.instance.post<RAGServerStartResponse>("/start-rag-chatbot", {}, config)
    );
    const res = await exec();
    if (res instanceof Error) throw res;
    return res as RAGServerStartResponse;
  }

  async checkServerStatus(): Promise<RAGServerStatus> {
    try {
      const config = this.applyHeaders({}, {}, true);
      const exec = this.safeAxiosApply<RAGServerStatus>(() =>
        this.instance.get<RAGServerStatus>("/rag-server-status", config)
      );
      const res = await exec();
      if (res instanceof Error) throw res;
      return res as RAGServerStatus;
    } catch (error) {
      return {
        isRunning: false,
        isStarting: false,
        error: error instanceof Error ? error.message : "Unknown error",
        port: 8001
      };
    }
  }

  async waitForServer(maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.checkServerStatus();
        if (status.isRunning) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    return false;
  }
}

export const ragServerService = new RAGServerService();
