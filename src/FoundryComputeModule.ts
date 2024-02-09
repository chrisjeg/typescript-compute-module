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
  logger?: Logger;
}

export class FoundryComputeModule<M extends QueryResponseMapping> {
  private static CONNECTION_ENV_VAR = "CONNECTION_TO_RUNTIME";

  private connectionInformation?: ConnectionInformation;
  private logger?: Logger;
  private queryRunner?: QueryRunner<M, keyof M>;

  // TODO: Dont return any
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

  public on<T extends keyof M>(event: T, listener: QueryListener<M>) {
    this.listeners[event] = listener;
    return this;
  }

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
