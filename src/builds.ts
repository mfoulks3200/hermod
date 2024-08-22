import { AWS } from "./aws";
import { SiteConfig } from "./config";

export type BuildChannels = { [channel: string]: Build[] };

export interface File {
    key: string;
    path: string;
    filename: string;
    lastModified: Date;
    size: number;
}

export interface Build {
    siteId: string;
    buildNumber: number;
    buildChannel: string;
    buildVersion: string;
    buildCommit: string;
    pathRoot: string;
    defaultFile: string;
    files: File[];
}

export class BuildManager {


    public site: SiteConfig;
    public builds: BuildChannels = {};

    constructor(site: SiteConfig) {
        this.site = site;
        this.initIndex();
    }

    private initIndex() {
        this.builds[this.site.productionChannelName] = [];
        this.builds[this.site.stagingChannelName] = [];
    }

    public getMostRecentBuild(channel: string): Build | undefined {
        const builds = this.builds[channel].sort((a, b) => a.buildNumber - b.buildNumber);
        return builds[builds.length - 1];
    }

    public static async detectDefaultFile(build: Build): Promise<string> {
        const files = await AWS.instance.listFiles(build.pathRoot + "/index");
        if (files.Contents) {
            build.defaultFile = files.Contents[0].Key!;
            return files.Contents[0].Key!;
        }
        build.defaultFile = build.pathRoot;
        return build.pathRoot;
    }

    public static deserializeBuild(build: BuildChannels, site: SiteConfig): BuildManager {
        const bm = new BuildManager(site);
        bm.builds = build;
        return bm;
    }

}