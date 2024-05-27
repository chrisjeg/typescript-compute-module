import { isAxiosError } from "axios";
import { Logger } from "./logger";
import { Static, TObject } from "@sinclair/typebox";
import { ComputeModuleApi } from "./api/ComputeModuleApi";
import { SupportedTypeboxTypes } from "./api/convertJsonSchematoFoundrySchema";
import { off } from "process";

export interface QueryResponseMapping {
  [queryType: string]: {
    input?: TObject;
    output: SupportedTypeboxTypes;
  };
}

export type QueryListener<M extends QueryResponseMapping> = <T extends keyof M>(
  message: M[T]["input"] extends TObject ? Static<M[T]["input"]> : undefined
) => Promise<Static<M[T]["output"]>>;

export class QueryRunner<M extends QueryResponseMapping> {
  private isResponsive = false;

  private responsiveEventListeners: Set<() => void> = new Set();

  constructor(
    private readonly computeModuleApi: ComputeModuleApi,
    private readonly listeners: Partial<{
      [K in keyof M]: QueryListener<Pick<M, K>>;
    }>,
    private defaultListener?: (query: any, queryType: string) => Promise<any>,
    private readonly logger?: Logger
  ) {}

  async run() {
    while (true) {
      try {
        const jobRequest = await this.computeModuleApi.getJobRequest();

        if (jobRequest.status === 200) {
          // If this is the first job, set the module as responsive
          if (!this.isResponsive) {
            this.setResponsive();
          }

          const { query, queryType, jobId } =
            jobRequest.data.computeModuleJobV1;
          this.logger?.info(`Job received - ID: ${jobId} Query: ${queryType}`);
          const listener = this.listeners[queryType];

          if (listener != null) {
            listener(query).then((response) =>
              this.computeModuleApi.postResult(jobId, response)
            );
          } else if (this.defaultListener != null) {
            this.defaultListener(query, queryType)?.then((response) =>
              this.computeModuleApi.postResult(jobId, response)
            );
          } else {
            this.logger?.error(`No listener for query type: ${queryType}`);
          }
        }
      } catch (e) {
        if (isAxiosError(e)) {
          this.logger?.error(
            `Error running module - Network Error: ${e.response?.status} ${e.response?.statusText}`
          );
        } else {
          this.logger?.error(`Error running module: ${e}`);
        }
      }
    }
  }

  public on(_eventName: "responsive", listener: () => void) {
    if (this.isResponsive) {
      listener();
    } else {
      this.responsiveEventListeners.add(listener);
    }
  }

  private setResponsive() {
    this.isResponsive = true;
    this.responsiveEventListeners.forEach((listener) => listener());
  }

  public updateDefaultListener(
    defaultListener: (query: any, queryType: string) => Promise<any>
  ) {
    this.defaultListener = defaultListener;
  }
}
