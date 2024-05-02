import { Logger } from "@saintno/needed-tools";

export const AppLogger = new Logger("AppLogger");

export const handleProcessExit = (callback: () => void) => {
  process.on("SIGINT", callback);
  process.on("SIGTERM", callback);
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomIntRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomIntTargetOffset = (target: number, offset: number) => {
  return target + randomIntRange(-offset, offset);
};
