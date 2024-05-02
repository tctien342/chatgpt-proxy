import z from "zod";
import { randomUUID } from "node:crypto";

const ENVSchema = z.object({
  BASE_URL: z.string().default("https://chat.openai.com"),
  APP_PORT: z
    .string()
    .transform((v) => Number(v))
    .default("3000"),
  API_TOKEN: z
    .string()
    .default("")
    .transform((val) => {
      if (!val) {
        return "sk-" + randomUUID().replaceAll("-", "");
      }
      return val;
    }),
  /**
   * Auto generate new token and fetch agent for openAI
   * @default 1 minute
   */
  AGENT_ROLL_INTERVAL: z
    .string()
    .transform((v) => Number(v))
    .default("60000"),
});

export const ENV = ENVSchema.parse(process.env);
