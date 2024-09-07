import { AWS } from "./aws";
import { Build, BuildManager, BuildChannels } from "./builds";
import { Config, SiteConfig } from "./config";

type SerializedSiteConfig = SiteConfig & { channels: BuildChannels };

interface SerializedIndex {
    sites: { [key: string]: SerializedSiteConfig };
    generated: number;
}

export class SiteManager {
    private static buildIndexPath = ".hermod/index.json";
    private static loadedIndex: boolean = false;
    public static sites: SiteConfig[] = [];
    public static buildManagers: BuildManager[] = [];

    public static lastIndexTime: number = 0;
    public static currentlyIndexing: boolean = false;
    public static indexInterval: number = 1000 * 60 * 10;
    public static minimumIndexInterval: number = 1000 * 15;

    public static isLoaded(): boolean {
        return SiteManager.loadedIndex;
    }

    public static async initialize(config: Config) {
        SiteManager.sites = config.sites;
        console.log("Starting index");
        if (await AWS.instance.fileExists(SiteManager.buildIndexPath)) {
            console.log("Loading index file")
            let newIndex = await SiteManager.loadIndex();
            SiteManager.sites = [];
            SiteManager.buildManagers = [];
            for (let key of Object.keys(newIndex.sites)) {
                const site: SerializedSiteConfig = newIndex.sites[key];
                SiteManager.sites.push(site);
                SiteManager.buildManagers.push(BuildManager.deserializeBuild(site.channels, site));
            }
            SiteManager.lastIndexTime = newIndex.generated;
            console.log("Finished loading index file")
        } else {
            console.log("Creating new index file")
            for (let site of SiteManager.sites) {
                console.log("New build manager", site.siteId);
                SiteManager.buildManagers.push(new BuildManager(site));
            }
            console.log(SiteManager.buildManagers);
            SiteManager.saveIndex();
            SiteManager.startIndexingProcess();
            console.log("Index file created")
        }
        setInterval(() => {
            if (Date.now() - SiteManager.lastIndexTime > SiteManager.indexInterval) {
                SiteManager.startIndexingProcess();
            }
        }, 5000);
        SiteManager.loadedIndex = true;
    }

    private static async saveIndex() {
        const resp = await AWS.instance.writeFile(SiteManager.buildIndexPath, JSON.stringify(SiteManager.serializeIndex()));
    }

    private static async loadIndex(): Promise<SerializedIndex> {
        const index = await AWS.instance.getFile(SiteManager.buildIndexPath);
        const rawIndex = await index.Body!.transformToString();
        return JSON.parse(rawIndex) as SerializedIndex;
    }

    public static getSite(siteId: string): SiteConfig | undefined {
        return SiteManager.sites.find(s => s.siteId === siteId);
    }

    public static serializeIndex(): any {
        let sites: { [key: string]: any } = {};
        for (let site of SiteManager.sites) {
            const buildManager = SiteManager.buildManagers.find(bm => bm.site.siteId == site.siteId);
            sites[site.siteId] = {
                siteName: site.siteName,
                siteId: site.siteId,
                domain: site.domain,
                productionChannelName: site.productionChannelName,
                stagingChannelName: site.stagingChannelName,
                allowAllChannels: site.allowAllChannels,
                allowVersionOverride: site.allowVersionOverride,
                channels: buildManager !== undefined ? buildManager.builds : {}
            }
        }
        return {
            sites: sites,
            generated: Date.now()
        }
    }

    public static async startIndexingProcess() {
        if (SiteManager.currentlyIndexing) {
            console.log("Cannot start a new indexing process, one is already running");
            return;
        }
        if (Date.now() - SiteManager.lastIndexTime < SiteManager.minimumIndexInterval) {
            const lastRunAgo = Math.round((Date.now() - SiteManager.lastIndexTime) / 1000);
            console.log(`Cannot start a new indexing process, one was already run ${lastRunAgo} seconds ago. `);
            return;
        }
        console.log("Starting new indexing process");
        SiteManager.currentlyIndexing = true;
        for (let buildManager of SiteManager.buildManagers) {
            console.log("Indexing", buildManager.site.siteId);
            let files = await AWS.instance.listFiles(`${buildManager.site.siteId}/${buildManager.site.productionChannelName}`);
            let existingHashes: Map<string, Build> = await buildManager.getAllBuildsByCommit();
            for (let file of files!) {
                let fileNameComponents = file.Key!.split("/");
                let normalizedPath = fileNameComponents.slice(3, fileNameComponents.length).join("/");
                let fileName = fileNameComponents[fileNameComponents.length - 1];
                let buildString = fileNameComponents[2];
                let [buildNumber, buildVersion, commitHash] = buildString.split("_");
                if (existingHashes.has(commitHash)) {
                    let build = existingHashes.get(commitHash);
                    build!.files.push({
                        key: file.Key!,
                        path: normalizedPath,
                        filename: fileName,
                        lastModified: file.LastModified!,
                        size: file.Size!
                    });
                    continue;
                }
                let build: Build = {
                    siteId: buildManager.site.siteId,
                    buildNumber: parseInt(buildNumber.split("-")[1]),
                    buildChannel: buildManager.site.productionChannelName,
                    buildVersion: buildVersion,
                    buildCommit: commitHash,
                    pathRoot: `${buildManager.site.siteId}/${buildManager.site.productionChannelName}/${buildString}`,
                    defaultFile: "",
                    files: [{
                        key: file.Key!,
                        path: normalizedPath,
                        filename: fileName,
                        lastModified: file.LastModified!,
                        size: file.Size!
                    }]
                }
                await BuildManager.detectDefaultFile(build)
                console.log("Found build ", build.buildNumber, build.buildVersion, build.buildCommit);
                buildManager.builds[buildManager.site.productionChannelName].push(build);
                existingHashes.set(commitHash, build);
            }
            await SiteManager.saveIndex();
        }
        await SiteManager.saveIndex();
        console.log("Finished Indexing Process");
        SiteManager.currentlyIndexing = false;
        SiteManager.lastIndexTime = Date.now();
    }

    private static getPosition(string: string, subString: string, index: number): number {
        return string.split(subString, index).join(subString).length;
    }

    public static attemptMatch(host: string) {
        if (process.env.ENV_CONTEXT == "DEV" && host.includes("localhost")) {
            return SiteManager.sites[0];
        }
        let site = SiteManager.sites.find(s => host.includes(s.domain));
        if (site) {
            return site;
        }
        return undefined;
    }
}