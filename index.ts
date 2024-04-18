import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import Stream from "@elysiajs/stream";
import { handleChatCompletion } from "./src/openai";
import bearer from "@elysiajs/bearer";
import { ENV } from "./env";
import { AppLogger } from "./src/tools";
import { AgentManager } from "./src/agent";

AgentManager.getInstance();

const app = new Elysia()
  .use(
    cors({
      origin: "*",
      allowedHeaders: ["*"],
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .use(bearer())
  .onBeforeHandle(({ bearer, set, request }) => {
    if (bearer !== ENV.API_TOKEN) {
      AppLogger.w(
        "handle",
        `Incomming ${request.method.toUpperCase()} request have been denied`,
        {
          url: request.url,
          reason: "Unauthorized",
        }
      );
      set.status = 401;
      return {
        status: 401,
        body: "Unauthorized",
      };
    }
    AppLogger.i("handle", `Incomming ${request.method.toUpperCase()} request`, {
      url: request.url,
    });
  })
  .options("*", () => "OK")
  .post("/v1/chat/completions", async ({ body }) => {
    const req = body as any;
    const isStream = req.stream ?? false;
    if (!isStream) {
      return handleChatCompletion({
        messages: req.messages,
      });
    }
    return new Stream(async (stream) => {
      return handleChatCompletion({
        messages: req.messages,
        streamRes: stream,
      });
    });
  })
  .all("*", () => "Not Found")
  .listen(3000);

AppLogger.i("START", "Server running on port", ENV.APP_PORT);
AppLogger.i("START", "Server running with token", ENV.API_TOKEN);
AppLogger.i("START", "Server running with endpoints", ["/v1/chat/completions"]);
