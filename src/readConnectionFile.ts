import { promises } from "fs";
import { Logger } from "./logger";

const READ_POLL_DELAY_MILLIS = 200;
const MAX_READ_ATTEMPTS = 100;

export interface ConnectionInformation {
  host: string;
  port: number;
  getJobPath: string;
  postResultPath: string;
  trustStorePath: string;
  moduleAuthToken: string;
}

/**
 * Polls the connection file until it is available and then returns the connection information.
 * @param path
 * @returns
 */
export const readConnectionFile = async (
  path: string,
  logger?: Logger
): Promise<ConnectionInformation> => {
  logger?.info(
    `Attempting reading connection file from ${path} [Poll interval ${READ_POLL_DELAY_MILLIS}ms]`
  );
  const startTime = Date.now();
  let attemptCount = 0;
  do {
    try {
      const blob = await promises.readFile(path, "utf-8");
      logger?.info(
        `Successfully read connection file from ${path} after ${
          Date.now() - startTime
        }ms`
      );
      return JSON.parse(blob);
    } catch (e) {
      // The file can take a while to appear, so we retry a few times
      // logger?.error(`Error reading connection file: ${e}`);
      await new Promise((resolve) =>
        setTimeout(resolve, READ_POLL_DELAY_MILLIS)
      );
    }
  } while (attemptCount++ < MAX_READ_ATTEMPTS);
  throw new Error(
    `Failed to read connection file after ${MAX_READ_ATTEMPTS} attempts`
  );
};
