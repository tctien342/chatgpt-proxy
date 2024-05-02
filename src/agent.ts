import UserAgent from "user-agents";
import { getNewSession } from "./openai";
import { AppLogger, randomIntTargetOffset } from "./tools";
import { ENV } from "../env";
import { sleep } from "bun";

export class AgentManager {
  static instance: AgentManager;

  private userAgent: UserAgent;
  private session?: Session;

  private constructor() {
    this.userAgent = new UserAgent();
  }

  /**
   * Rolls the agent by generating a new session ID and updating the token and device ID.
   */
  async roll(tries = 0): Promise<Session> {
    AppLogger.i("AgentManager", "Trigger rolling agent");
    this.session = undefined;
    if (tries === ENV.MAX_SESSION_TRIES) {
      throw new Error(
        `Failed to get session ID after ${ENV.MAX_SESSION_TRIES} retries`
      );
    }
    return await getNewSession()
      .then((session) => {
        this.session = session;
        return session;
      })
      .catch(async (e) => {
        AppLogger.w(
          "AgentManager",
          "Failed to get session ID, retry after 3s",
          e
        );
        await sleep(randomIntTargetOffset(3000, 500));
        return await this.roll(tries + 1);
      });
  }

  get userAgentString() {
    return this.userAgent.toString();
  }

  get openAiHeaders(): HeadersInit {
    return {
      "oai-device-id": this.session?.deviceId ?? "",
      "openai-sentinel-chat-requirements-token": this.session?.token ?? "",
    };
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  get crrSession() {
    return this.session;
  }
}
