import axios, { AxiosInstance } from "axios";
import { Logger } from "./logger";
import {
  ConnectionInformation,
  readConnectionFile,
} from "./readConnectionFile";
import fs from "fs";
import https from "https";

export interface FoundryComputeModuleOptions {
  logger?: Logger;
}

export class FoundryComputeModule<T> {
  private connectionInformation?: ConnectionInformation;
  private logger?: Logger;
  private static CONNECTION_ENV_VAR = "CONNECTION_TO_RUNTIME";

  // TODO: Dont return any
  private listeners: { [K in keyof T]: (data: T[K]) => Promise<any> } = {} as {
    [K in keyof T]: (data: T[K]) => any;
  };
  private defaultListener?: (data: any, queryName: string) => Promise<any>;

  constructor({ logger }: FoundryComputeModuleOptions) {
    this.logger = logger;

    const connectionPath = process.env[FoundryComputeModule.CONNECTION_ENV_VAR];
    readConnectionFile(connectionPath).then((connectionInformation) => {
      this.logger?.info("Connection information loaded");
      this.connectionInformation = connectionInformation;
    });
  }

  async initialize() {
    if (!this.connectionInformation) {
      throw new Error("Connection information not loaded");
    }
    const instance = axios.create({
      baseURL: `https://${this.connectionInformation.host}:${this.connectionInformation.port}`,
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.connectionInformation.trustStorePath),
      }),
      headers: {
        "Module-Auth-Token": this.connectionInformation.moduleAuthToken,
      },
    });
    this.logger?.info("Module initialized");
    this.run(this.connectionInformation, instance);
  }

  async run(
    connectionInformation: ConnectionInformation,
    instance: AxiosInstance
  ) {
    while (true) {
      try {
        const jobRequest = await instance.get<{
          type: "computeModuleJobV1";
          computeModuleJobV1: {
            jobId: string;
            queryType: string;
            query: any;
          };
        }>(connectionInformation.getJobPath);

        if (jobRequest.status === 200) {
          this.logger?.info(
            "Job received - ID: " + jobRequest.data.computeModuleJobV1.jobId
          );
          const { query, queryType } = jobRequest.data.computeModuleJobV1;
          const listener = this.listeners[queryType as keyof T];
          if (listener != null) {
            listener(query).then((response) => {
              instance.post(connectionInformation.postResultPath, response, {
                headers: {
                  "Content-Type": "application/octet-stream",
                },
              });
            });
          } else if (this.defaultListener != null) {
            this.defaultListener(query, queryType).then((response) => {
              instance.post(connectionInformation.postResultPath, response, {
                headers: {
                  "Content-Type": "application/octet-stream",
                },
              });
            });
          } else {
            this.logger?.error(`No listener for query type: ${queryType}`);
          }
        }
      } catch (e) {
        this.logger?.error(`Error running module: ${e}`);
      }
    }
  }

  public on<K extends keyof T>(event: K, listener: (data: T[K]) => any) {
    this.listeners[event] = listener;
    return this;
  }

  public default(listener: (data: any, queryName: string) => any) {
    this.defaultListener = listener;
    return this;
  }
}
