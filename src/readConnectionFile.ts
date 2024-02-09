import { promises } from "fs";

const CONNECTION_ENV_VAR = "CONNECTION_TO_RUNTIME";
const READ_POLL_DELAY_MILLIS = 100;

const CONNECTION_INFO_PATH = process.env[CONNECTION_ENV_VAR];

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
  path: string
): Promise<ConnectionInformation> => {
  while (true) {
    try {
      const blob = await promises.readFile(path, "utf-8");
      return JSON.parse(blob);
    } catch (e) {
      console.error(`Error reading connection file: ${e}`);
      await new Promise((resolve) =>
        setTimeout(resolve, READ_POLL_DELAY_MILLIS)
      );
    }
  }
};
