import { waitForFile } from "../fs/waitForFile";

export interface SourceCredentialsFile {
    [source: string]: {
        [credential: string]: string;
    }
}

export class SourceCredentials {
    private _sourceCredentialsPromise: Promise<SourceCredentialsFile> | null = null;

    constructor(private credentialPath: string){}

    public async getCredential(sourceApiName: string, credentialName: string): Promise<string | null> {
        const sourceCredentials = await this.sourceCredentials;
        return sourceCredentials[sourceApiName]?.[credentialName] ?? null;
    }

    private get sourceCredentials(): Promise<SourceCredentialsFile> {
        return this._sourceCredentialsPromise ??= waitForFile<SourceCredentialsFile>(this.credentialPath);
    }
}