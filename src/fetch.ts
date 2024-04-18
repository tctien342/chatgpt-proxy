import { ENV } from "../env";

import https from "https";
import { APIQueueItem, CustomFetch, QueueManager } from "@saintno/needed-tools";
import { AgentManager } from "./agent";

const cFetch = new CustomFetch();
const fAgent = new https.Agent({
  rejectUnauthorized: false,
});

const Fetcher = APIQueueItem.createInstance(
  cFetch,
  new QueueManager("Fetcher")
);

/**
 * Generates the headers object for a fetch request.
 *
 * @param headers - Optional headers to be included in the generated headers object.
 * @returns The generated headers object.
 */
const generateFetchHeaders = (headers?: HeadersInit) => {
  return {
    ...headers,
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "oai-language": "en-US",
    origin: ENV.BASE_URL,
    pragma: "no-cache",
    referer: ENV.BASE_URL,
    "sec-ch-ua":
      '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": AgentManager.getInstance().userAgentString,
  };
};

cFetch.setBeforeCall(async (url, config) => {
  config = {
    ...config,
    headers: generateFetchHeaders(config.headers),
    agent: fAgent,
  } as FetchRequestInit;
  return { url, config };
});

cFetch.setOnParse(async (response) => {
  return response;
});

export { Fetcher, generateFetchHeaders };
