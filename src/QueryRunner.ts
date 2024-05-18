import { AxiosInstance, isAxiosError } from "axios";
import { Logger } from "./logger";
import { ConnectionInformation } from "./readConnectionFile";

export interface QueryResponseMapping {
  [queryType: string]: { query: any; response: any };
}

export type QueryListener<M extends QueryResponseMapping> = <T extends keyof M>(
  message: M[T]["query"]
) => Promise<M[T]["response"]>;

export class QueryRunner<M extends QueryResponseMapping, T extends keyof M> {
  constructor(
    private readonly connectionInformation: ConnectionInformation,
    private readonly axios: AxiosInstance,
    private readonly listeners: Partial<{
      [K in keyof M]: QueryListener<Pick<M, K>>;
    }>,
    private defaultListener?: (query: any, queryType: string) => Promise<any>,
    private readonly logger?: Logger
  ) {}

  async run() {
    while (true) {
      try {
        const jobRequest = await this.getJobRequest();

        if (jobRequest.status === 200) {
          const { query, queryType, jobId } =
            jobRequest.data.computeModuleJobV1;
          this.logger?.info("Job received - ID: " + jobId);
          const listener = this.listeners[queryType];

          if (listener != null) {
            listener(query).then((response) =>
              this.postResult(jobId, response)
            );
          } else if (this.defaultListener != null) {
            this.defaultListener(query, queryType).then((response) =>
              this.postResult(jobId, response)
            );
          } else {
            this.logger?.error(`No listener for query type: ${queryType}`);
          }
        }
      } catch (e) {
        if (isAxiosError(e)) {
          this.logger?.error(`Error running module: ${e.toJSON()}`);
        } else {
          this.logger?.error(`Error running module: ${e}`);
        }
      }
    }
  }

  public updateDefaultListener(
    defaultListener: (query: any, queryType: string) => Promise<any>
  ) {
    this.defaultListener = defaultListener;
  }

  private getJobRequest = async () => {
    return this.axios.get<{
      type: "computeModuleJobV1";
      computeModuleJobV1: {
        jobId: string;
        queryType: T extends string ? T : never;
        query: M[T]["query"];
      };
    }>(this.connectionInformation.getJobPath);
  };

  private postResult = async (jobId: string, response: any) => {
    return this.axios.post(
      `${this.connectionInformation.postResultPath}/${jobId}`,
      response,
      {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      }
    );
  };
}
