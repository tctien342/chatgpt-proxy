import UserAgent from "user-agents";
import { getNewSessionId } from "./openai";
import { AppLogger } from "./tools";
import { ENV } from "../env";
import { sleep } from "bun";

export class AgentManager {
  static instance: AgentManager;

  private userAgent: UserAgent;
  private token?: string;
  private oaiDeviceId?: string;

  private constructor() {
    this.userAgent = new UserAgent();
    this.autoRoll();
  }

  private async autoRoll() {
    while (true) {
      AppLogger.i("AgentManager", "Trigger rolling agent");
      this.roll();
      await sleep(ENV.AGENT_ROLL_INTERVAL);
    }
  }

  /**
   * Rolls the agent by generating a new session ID and updating the token and device ID.
   */
  private roll() {
    this.userAgent.random();
    getNewSessionId()
      .then(({ token, newDeviceId }) => {
        this.token = token;
        this.oaiDeviceId = newDeviceId;
      })
      .catch((e) => {
        AppLogger.w(
          "AgentManager",
          "Failed to get session ID, retry after 2s",
          e
        );
        sleep(2000).then(() => this.roll());
      });
  }

  get userAgentString() {
    return this.userAgent.toString();
  }

  get openAiHeaders(): HeadersInit {
    return {
      "oai-device-id": this.oaiDeviceId ?? "",
      "openai-sentinel-chat-requirements-token": this.token ?? "",
    };
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }
}
