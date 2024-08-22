import fs from 'node:fs';
import path from 'node:path';
import { AWS } from './aws';

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
    sites: SiteConfig[];
}

export class Config {

    public static current: Config;
    private static configPath = ".hermod/config.json";

    public async initialize() {
        if (process.env.ENV_CONTEXT == "DEV") {
            Config.current = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', 'config.json'), 'utf8'));
        } else {
            console.log("Reading config from S3");
            const newConfig = await AWS.instance.getFile(Config.configPath);
            Config.current = JSON.parse(await newConfig.Body!.transformToString());
            console.log("Got config from S3");
        }
    }
}