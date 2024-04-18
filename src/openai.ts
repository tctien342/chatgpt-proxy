/**
 * This file included ported funtion from @PawanOsman
 */
import { Fetcher } from "./fetch";
import { ENV } from "../env";

import { randomUUID } from "node:crypto";
import { encode } from "gpt-3-encoder";
import Stream from "@elysiajs/stream";
import { AgentManager } from "./agent";
import { APIQueueItem } from "@saintno/needed-tools";
import { AppLogger } from "./tools";

const apiUrl = `${ENV.BASE_URL}/backend-anon/conversation`;

/**
 * Generates a unique completion ID with the given prefix.
 * @param prefix The prefix to use for the completion ID. Defaults to "cmpl-".
 * @returns The generated completion ID.
 */
function generateCompletionId(prefix: string = "cmpl-") {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 28;
  for (let i = 0; i < length; i++) {
    prefix += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return prefix;
}

/**
 * Converts chunks of data into lines.
 * @param chunksAsync An async iterable that yields chunks of data.
 * @returns An async generator that yields lines of data.
 */
async function* chunksToLines(chunksAsync: any) {
  let previous = "";
  for await (const chunk of chunksAsync) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    previous += bufferChunk;
    let eolIndex: number;
    while ((eolIndex = previous.indexOf("\n")) >= 0) {
      // line includes the EOL
      const line = previous.slice(0, eolIndex + 1).trimEnd();
      if (line === "data: [DONE]") break;
      if (line.startsWith("data: ")) yield line;
      previous = previous.slice(eolIndex + 1);
    }
  }
}

/**
 * Converts lines from an asynchronous iterator to messages.
 * @param linesAsync - An asynchronous iterator that yields lines.
 * @returns An asynchronous generator that yields messages.
 */
async function* linesToMessages(linesAsync: any) {
  for await (const line of linesAsync) {
    const message = line.substring("data :".length);
    yield message;
  }
}

/**
 * Asynchronously generates a stream of completions from the provided data.
 *
 * @param data - The data to process for completions.
 * @returns An asynchronous generator that yields completions.
 */
async function* streamCompletion(data: any) {
  yield* linesToMessages(chunksToLines(data));
}

/**
 * Generates a new session ID and token for the OpenAI API.
 * @returns An object containing the new device ID and token.
 */
async function getNewSessionId() {
  let newDeviceId = randomUUID();
  const data = await new Fetcher(
    `${ENV.BASE_URL}/backend-anon/sentinel/chat-requirements`
  )
    .json()
    .post<{ token: string }>(
      {},
      {
        headers: { "oai-device-id": newDeviceId },
      }
    );
  AppLogger.i(
    "getNewSessionId",
    `System: Successfully refreshed session ID and token. ${
      !data.token ? "(Now it's ready to process requests)" : ""
    }`
  );
  return { newDeviceId, token: data.token };
}

/**
 * Handles chat completion by sending messages to the OpenAI API and processing the response.
 */
async function handleChatCompletion({
  messages,
  streamRes,
}: {
  /**
   * The messages to process for completion.
   */
  messages: { role: string; content: string }[];
  /**
   * The stream response to send the completion to.
   */
  streamRes?: Stream<string | number | boolean | object>;
}) {
  let promptTokens = 0;
  let completionTokens = 0;
  const body = {
    action: "next",
    messages: messages.map((message: { role: string; content: string }) => ({
      author: { role: message.role },
      content: { content_type: "text", parts: [message.content] },
    })),
    parent_message_id: randomUUID(),
    model: "text-davinci-002-render-sha",
    timezone_offset_min: -180,
    suggestions: [],
    history_and_training_disabled: true,
    conversation_mode: { kind: "primary_assistant" },
    websocket_request_id: randomUUID(),
  };
  for (let message of messages) {
    promptTokens += encode(message.content).length;
  }
  try {
    let fullContent = "";
    let finish_reason = null;
    let created = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    let requestId = generateCompletionId("chatcmpl-");

    const response = await new Fetcher(apiUrl).post<Response>(body, {
      headers: AgentManager.getInstance().openAiHeaders,
    });
    if (!response.ok || !response.body) {
      throw new Error("An error occurred while processing the request.");
    }
    for await (const message of streamCompletion(response.body as any)) {
      if (message.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}$/)) {
        // Skip heartbeat detection
        continue;
      }

      const parsed = JSON.parse(message);
      let content = parsed?.message?.content?.parts[0] ?? "";
      let status = parsed?.message?.status ?? "";
      for (let message of messages) {
        if (message.content === content) {
          content = "";
          break;
        }
      }

      switch (status) {
        case "in_progress":
          finish_reason = null;
          break;
        case "finished_successfully":
          let finish_reason_data =
            parsed?.message?.metadata?.finish_details?.type ?? null;
          switch (finish_reason_data) {
            case "max_tokens":
              finish_reason = "length";
              break;
            case "stop":
            default:
              finish_reason = "stop";
          }
          break;
        default:
          finish_reason = null;
      }

      if (content === "") continue;
      let completionChunk = content.replace(fullContent, "");
      completionTokens += encode(completionChunk).length;
      if (streamRes) {
        let response = {
          id: requestId,
          created: created,
          object: "chat.completion.chunk",
          model: "gpt-3.5-turbo",
          choices: [
            {
              delta: {
                content: completionChunk,
              },
              index: 0,
              finish_reason: finish_reason,
            },
          ],
        };
        streamRes.send(JSON.stringify(response));
      }
      fullContent = content.length > fullContent.length ? content : fullContent;
    }
    if (streamRes) {
      streamRes.send(
        JSON.stringify({
          id: requestId,
          created: created,
          object: "chat.completion.chunk",
          model: "gpt-3.5-turbo",
          choices: [
            {
              delta: {
                content: "",
              },
              index: 0,
              finish_reason: finish_reason,
            },
          ],
        })
      );
      streamRes.close();
    } else {
      return {
        id: requestId,
        created: created,
        model: "gpt-3.5-turbo",
        object: "chat.completion",
        choices: [
          {
            finish_reason: finish_reason,
            index: 0,
            message: {
              content: fullContent,
              role: "assistant",
            },
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
      };
    }
  } catch (error) {
    const content = {
      status: false,
      error: {
        message:
          "An error occurred. Please check the server console to confirm it is ready and free of errors. Additionally, ensure that your request complies with OpenAI's policy.",
        type: "invalid_request_error",
      },
      support: "https://discord.pawan.krd",
    };
    if (streamRes) {
      streamRes.send(JSON.stringify(content));
      streamRes.close();
    } else {
      return content;
    }
  }
}

export {
  generateCompletionId,
  chunksToLines,
  linesToMessages,
  streamCompletion,
  getNewSessionId,
  handleChatCompletion,
};
