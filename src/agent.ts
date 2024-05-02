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
    this.autoRoll();
  }

  private async autoRoll() {
    while (true) {
      AppLogger.i("AgentManager", "Trigger rolling agent");
      this.roll();
      await sleep(randomIntTargetOffset(ENV.AGENT_ROLL_INTERVAL, 3000));
    }
  }

  /**
   * Rolls the agent by generating a new session ID and updating the token and device ID.
   */
  private roll() {
    this.userAgent.random();
    getNewSession()
      .then((session) => {
        this.session = session;
      })
      .catch((e) => {
        AppLogger.w(
          "AgentManager",
          "Failed to get session ID, retry after 3s",
          e
        );
        sleep(randomIntTargetOffset(3000, 500)).then(() => this.roll());
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
