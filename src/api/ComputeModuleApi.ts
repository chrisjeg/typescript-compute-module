import axios from "axios";
import https from "https";
import fs from "fs";
import { ConnectionInformation } from "../readConnectionFile";
import { Schema } from "./schemaTypes";

interface JobRequest {
  type: "computeModuleJobV1";
  computeModuleJobV1: {
    jobId: string;
    queryType: string;
    query: any;
  };
}

/**
 * API for interacting with the runtime.
 */
export class ComputeModuleApi {
  private axiosInstance: axios.AxiosInstance;

  constructor(private connectionInformation: ConnectionInformation) {
    const { host, port, moduleAuthToken, trustStorePath } =
      connectionInformation;

    this.axiosInstance = axios.create({
      baseURL: `https://${host}:${port}`,
      httpsAgent: new https.Agent({
        ca:
          trustStorePath != null ? fs.readFileSync(trustStorePath) : undefined,
      }),
      headers: {
        "Module-Auth-Token": moduleAuthToken,
      },
    });
  }

  public getJobRequest = async () =>
    this.axiosInstance.get<JobRequest>(this.connectionInformation.getJobPath);

  public postResult = async <ResponseType>(
    jobId: string,
    response: ResponseType
  ) => {
    return this.axiosInstance.post(
      `${this.connectionInformation.postResultPath}/${jobId}`,
      response,
      {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      }
    );
  };

  public postSchema = async (schemas: Schema[]) => {
    return this.axiosInstance.post(
      this.connectionInformation.basePath + "/schemas",
      schemas
    );
  };
}
