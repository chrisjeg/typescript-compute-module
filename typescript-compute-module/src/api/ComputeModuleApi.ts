import https from "https";
import { Schema } from "./schemaTypes";
import axios from "axios";

export interface ConnectionInformation {
  getJobUri: string; // GET_JOB_URI
  postResultUri: string; // POST_RESULT_URI
  postSchemaUri: string; // POST_SCHEMA_URI
  trustStore: Promise<string>; // DEFAULT_CA_PATH
  moduleAuthToken: Promise<string>; // MODULE_AUTH_TOKEN
}

/**
 * API for interacting with the runtime.
 */
export class ComputeModuleApi {
  private axiosInstance: axios.AxiosInstance | null = null;

  constructor(private connectionInformation: ConnectionInformation) {}

  public getJobRequest = async () => {
    const instance = await this.getAxios();
    return instance.get<{
      type: "computeModuleJobV1";
      computeModuleJobV1: {
        jobId: string;
        queryType: string;
        query: any;
      };
    }>(this.connectionInformation.getJobUri);
  };

  public postResult = async <ResponseType>(
    jobId: string,
    response: ResponseType
  ) => {
    const instance = await this.getAxios();
    return instance.post(this.connectionInformation.postResultUri + "/" + jobId, response, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  };

  public postSchema = async (schemas: Schema[]) => {
    const instance = await this.getAxios();
    return instance.post(this.connectionInformation.postSchemaUri, schemas);
  };

  private getAxios = async () => {
    if (this.axiosInstance == null) {
      this.axiosInstance = axios.create({
        httpsAgent: new https.Agent({
          ca: await this.connectionInformation.trustStore,
        }),
        headers: {
          "Module-Auth-Token": await this.connectionInformation.moduleAuthToken,
        },
      });
    }
    return this.axiosInstance;
  };

  private httpsRequest = async <T>(
    uri: string,
    {
      method = "GET",
      additionalHeaders = {},
      body,
    }: {
      method?: string;
      additionalHeaders?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<T | null> => {
    const [trustStore, moduleAuthToken] = await Promise.all([
      this.connectionInformation.trustStore,
      this.connectionInformation.moduleAuthToken,
    ]);
    return new Promise<T | null>((resolve, reject) => {
      const url = new URL(uri);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Module-Auth-Token": moduleAuthToken,
          ...additionalHeaders,
        },
        agent: new https.Agent({
          ca: trustStore,
        }),
      };
      const req = https.request(options, (res) => {
        let data = "";
        res
          .on("data", (chunk) => {
            data += chunk;
          })
          .on("error", reject)
          .on("end", () => {
            if (res.statusCode != null && res.statusCode >= 400) {
              reject(
                new StatusCodeError(res.statusCode, res.statusMessage, data)
              );
              return;
            }
            if (data === "") {
              resolve(null);
              return;
            }
            try {
              console.log("data", data);
              const parsedData = JSON.parse(data);
              resolve(parsedData as T);
            } catch (error) {
              reject(error);
            }
          });
      });
      req.on("error", (e) => {
        reject(e);
      });
      if (body != null && method !== "GET") {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };
}

export class StatusCodeError extends Error {
  constructor(
    public statusCode: number,
    public statusMessage: string | undefined,
    public body: any
  ) {
    super(`Request failed with status code ${statusCode}: ${statusMessage}`);
    this.name = "StatusCodeError";
    Object.setPrototypeOf(this, StatusCodeError.prototype);
  }
}
