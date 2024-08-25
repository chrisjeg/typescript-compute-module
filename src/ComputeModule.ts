import { Logger, loggerToInstanceLogger } from "./logger";
import {
  ConnectionInformation,
  readConnectionFile,
} from "./readConnectionFile";
import {
  QueryListener,
  QueryResponseMapping,
  QueryRunner,
} from "./QueryRunner";
import { ComputeModuleApi } from "./api/ComputeModuleApi";
import { convertJsonSchemaToCustomSchema } from "./api/convertJsonSchematoFoundrySchema";
import { Static } from "@sinclair/typebox";
import { SourceCredentials } from "./sources/SourceCredentials";

export interface ComputeModuleOptions<M extends QueryResponseMapping = any> {
  /**
   * Definitions for the queries that the module will respond to, defined using typebox.
   * @example
   * ```typescript
   * import { Type } from "@sinclair/typebox";
   * const definitions = {
   *    "isFirstName": {
   *        input: Type.String(),
   *        output: Type.Boolean(),
   *      },
   * };
   * ```
   *
   * If not provided, functions will not be autoregistered and typesafety will not be provided.
   */
  definitions?: M;
  /**
   * Logger to use for logging, if not provided, no logging will be done.
   * This interface accepts console, winston, or any other object that has the same methods as console.
   */
  logger?: Logger;
  /**
   * Instance ID to use for logging, if not provided no instance ID will be added
   */
  instanceId?: string;
}

export class ComputeModule<M extends QueryResponseMapping> {
  private static CONNECTION_ENV_VAR = "CONNECTION_TO_RUNTIME";
  // Path to the Source credentials file in Compute Modules
  private static SOURCE_CREDENTIALS = "SOURCE_CREDENTIALS";

  private sourceCredentials: SourceCredentials | null;
  private connectionInformation?: ConnectionInformation;
  private logger?: Logger;
  private queryRunner?: QueryRunner<M>;
  private definitions?: M;

  private listeners: Partial<{
    [K in keyof M]: QueryListener<Pick<M, K>>;
  }> = {};
  private defaultListener?: (data: any, queryName: string) => Promise<any>;

  constructor({ logger, instanceId, definitions }: ComputeModuleOptions<M>) {
    this.logger =
      logger != null ? loggerToInstanceLogger(logger, instanceId) : undefined;
    this.definitions = definitions;

    const sourceCredentialsPath = process.env[ComputeModule.SOURCE_CREDENTIALS];
    this.sourceCredentials = sourceCredentialsPath != null ? new SourceCredentials(sourceCredentialsPath) : null;

    if (process.env.NODE_ENV === "development") {
      console.warn("Inactive module - running in dev mode");
      return;
    }

    const connectionPath = process.env[ComputeModule.CONNECTION_ENV_VAR];
    if (!connectionPath) {
      throw new Error(
        "Connection path not found in environment variables, please set CONNECTION_TO_RUNTIME to the path of the connection file. This may indicate that the runtime has not been included."
      );
    }

    readConnectionFile(connectionPath, this.logger).then(
      (connectionInformation) => {
        this.logger?.info("Connection information loaded");
        this.connectionInformation = connectionInformation;
        this.initialize();
      }
    );
  }

  /**
   * Adds a listener for a specific query, only one response listener can be added per query
   * @param queryName Foundry query name to respond to
   * @param listener Function to run when the query is received
   * @returns
   */
  public register<T extends keyof M>(
    queryName: T,
    listener: (data: Static<M[T]["input"]>) => Promise<Static<M[T]["output"]>>
  ) {
    this.listeners[queryName] = listener;
    return this;
  }

  /**
   * Adds a listener for events within the compute module
   * - responsive: When the module is responsive and can receive queries
   * @returns
   */
  public on(_eventName: "responsive", listener: () => void) {
    this.queryRunner?.on("responsive", listener);
    return this;
  }

  /**
   * Adds a default listener for when no other listener is found for a query
   * @param listener Function to run when the query is received
   * @returns
   */
  public default(listener: (data: any, queryName: string) => Promise<any>) {
    this.defaultListener = listener;
    this.queryRunner?.updateDefaultListener(listener);
    return this;
  }

  private async initialize() {
    if (!this.connectionInformation) {
      throw new Error("Connection information not loaded");
    }

    const computeModuleApi = new ComputeModuleApi(this.connectionInformation);
    this.queryRunner = new QueryRunner<M>(
      computeModuleApi,
      this.listeners,
      this.defaultListener,
      this.logger
    );
    this.queryRunner.on("responsive", () => {
      this.logger?.info("Module is responsive");
      if (this.definitions) {
        const schemas = Object.entries(this.definitions).map(
          ([queryName, query]) =>
            convertJsonSchemaToCustomSchema(
              queryName,
              query.input,
              query.output
            )
        );
        this.logger?.info(`Posting schemas: ${JSON.stringify(schemas)}`);
        computeModuleApi.postSchema(schemas);
      }
    });
    this.queryRunner.run();
  }

  public async getCredential(sourceApiName: string, credentialName: string) {
    if(this.sourceCredentials == null){
      throw new Error(
        "No source credentials mounted. This implies the SOURCE_CREDENTIALS environment variable has not been set, ensure you have set sources mounted on the Compute Module."
      );
    }
    return this.sourceCredentials.getCredential(sourceApiName, credentialName);
  }
}
