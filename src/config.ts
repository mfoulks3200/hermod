import fs from 'node:fs';

export interface SiteConfig {
    siteId: string;
    siteName: string;
    domain: string;
    productionChannelName: string;
    stagingChannelName: string;
    allowAllChannels: boolean;
    allowVersionOverride: boolean;
}

export interface Config {
    s3Bucket: string;
    s3Region: string;
    sites: SiteConfig[];
}

export class Config {

    public static current: Config;

    constructor(path: string) {
        Config.current = JSON.parse(fs.readFileSync(path, 'utf8'));
    }
}