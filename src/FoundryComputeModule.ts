import axios from "axios";
import { Logger } from "./logger";
import {
  ConnectionInformation,
  readConnectionFile,
} from "./readConnectionFile";
import fs from "fs";
import https from "https";
import {
  QueryListener,
  QueryResponseMapping,
  QueryRunner,
} from "./QueryRunner";

export interface FoundryComputeModuleOptions {
  /**
   * Logger to use for logging, if not provided, no logging will be done.
   * This interface accepts console, winston, or any other object that has the same methods as console.
   */
  logger?: Logger;
}

export class FoundryComputeModule<M extends QueryResponseMapping> {
  private static CONNECTION_ENV_VAR = "CONNECTION_TO_RUNTIME";

  private connectionInformation?: ConnectionInformation;
  private logger?: Logger;
  private queryRunner?: QueryRunner<M, keyof M>;

  private listeners: Partial<{
    [K in keyof M]: QueryListener<M>;
  }> = {};
  private defaultListener?: (data: any, queryName: string) => Promise<any>;

  constructor({ logger }: FoundryComputeModuleOptions) {
    this.logger = logger;
    const connectionPath = process.env[FoundryComputeModule.CONNECTION_ENV_VAR];

    readConnectionFile(connectionPath).then((connectionInformation) => {
      this.logger?.info("Connection information loaded");
      this.connectionInformation = connectionInformation;
      this.initialize();
    });
  }

  private async initialize<T extends keyof M>() {
    if (!this.connectionInformation) {
      throw new Error("Connection information not loaded");
    }
    const axiosInstance = axios.create({
      baseURL: `https://${this.connectionInformation.host}:${this.connectionInformation.port}`,
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.connectionInformation.trustStorePath),
      }),
      headers: {
        "Module-Auth-Token": this.connectionInformation.moduleAuthToken,
      },
    });
    this.queryRunner = new QueryRunner<M, T>(
      this.connectionInformation,
      axiosInstance,
      this.logger,
      this.listeners,
      this.defaultListener
    );
    this.queryRunner.run();
  }

  /**
   * Adds a listener for a specific query, only one response listener can be added per query
   * @param queryName Foundry query name to respond to
   * @param listener Function to run when the query is received
   * @returns
   */
  public on<T extends keyof M>(queryName: T, listener: QueryListener<M>) {
    this.listeners[queryName] = listener;
    return this;
  }

  /**
   * Adds a default listener for when no other listener is found for a query
   * @param listener Function to run when the query is received
   * @returns
   */
  public default(listener: (data: any, queryName: string) => any) {
    this.defaultListener = listener;
    this.queryRunner?.updateDefaultListener(listener);
    return this;
  }
}

const myModule = new FoundryComputeModule({
  logger: console,
});

myModule.on("test", async (data) => "Hello " + data);
