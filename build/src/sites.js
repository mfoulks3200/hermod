"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteManager = void 0;
const aws_1 = require("./aws");
const builds_1 = require("./builds");
class SiteManager {
    static isLoaded() {
        return SiteManager.loadedIndex;
    }
    static initialize(config) {
        return __awaiter(this, void 0, void 0, function* () {
            SiteManager.sites = config.sites;
            console.log("Starting index");
            if (yield aws_1.AWS.instance.fileExists(SiteManager.buildIndexPath)) {
                console.log("Loading index file");
                let newIndex = yield SiteManager.loadIndex();
                SiteManager.sites = [];
                SiteManager.buildManagers = [];
                for (let key of Object.keys(newIndex.sites)) {
                    const site = newIndex.sites[key];
                    SiteManager.sites.push(site);
                    SiteManager.buildManagers.push(builds_1.BuildManager.deserializeBuild(site.channels, site));
                }
                SiteManager.lastIndexTime = newIndex.generated;
                console.log("Finished loading index file");
            }
            else {
                console.log("Creating new index file");
                for (let site of SiteManager.sites) {
                    console.log("New build manager", site.siteId);
                    SiteManager.buildManagers.push(new builds_1.BuildManager(site));
                }
                console.log(SiteManager.buildManagers);
                SiteManager.saveIndex();
                SiteManager.startIndexingProcess();
                console.log("Index file created");
            }
            setInterval(() => {
                if (Date.now() - SiteManager.lastIndexTime > SiteManager.indexInterval) {
                    SiteManager.startIndexingProcess();
                }
            }, 5000);
        });
    }
    static saveIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield aws_1.AWS.instance.writeFile(SiteManager.buildIndexPath, JSON.stringify(SiteManager.serializeIndex()));
        });
    }
    static loadIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            const index = yield aws_1.AWS.instance.getFile(SiteManager.buildIndexPath);
            const rawIndex = yield index.Body.transformToString();
            return JSON.parse(rawIndex);
        });
    }
    static getSite(siteId) {
        return SiteManager.sites.find(s => s.siteId === siteId);
    }
    static serializeIndex() {
        let sites = {};
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
            };
        }
        return {
            sites: sites,
            generated: Date.now()
        };
    }
    static startIndexingProcess() {
        return __awaiter(this, void 0, void 0, function* () {
            if (SiteManager.currentlyIndexing) {
                return;
            }
            if (Date.now() - SiteManager.lastIndexTime > SiteManager.minimumIndexInterval) {
                return;
            }
            console.log("Starting Indexing Process");
            SiteManager.currentlyIndexing = true;
            for (let buildManager of SiteManager.buildManagers) {
                console.log("Indexing", buildManager.site.siteId);
                let files = yield aws_1.AWS.instance.listFiles(`${buildManager.site.siteId}/${buildManager.site.productionChannelName}`);
                let existingHashes = yield buildManager.getAllBuildsByCommit();
                for (let file of files.Contents) {
                    let fileNameComponents = file.Key.split("/");
                    let normalizedPath = fileNameComponents.slice(3, fileNameComponents.length).join("/");
                    let fileName = fileNameComponents[fileNameComponents.length - 1];
                    let buildString = fileNameComponents[2];
                    let [buildNumber, buildVersion, commitHash] = buildString.split("_");
                    if (existingHashes.has(commitHash)) {
                        let build = existingHashes.get(commitHash);
                        build.files.push({
                            key: file.Key,
                            path: normalizedPath,
                            filename: fileName,
                            lastModified: file.LastModified,
                            size: file.Size
                        });
                        continue;
                    }
                    let build = {
                        siteId: buildManager.site.siteId,
                        buildNumber: parseInt(buildNumber.split("-")[1]),
                        buildChannel: buildManager.site.productionChannelName,
                        buildVersion: buildVersion,
                        buildCommit: commitHash,
                        pathRoot: `${buildManager.site.siteId}/${buildManager.site.productionChannelName}/${buildString}`,
                        defaultFile: "",
                        files: [{
                                key: file.Key,
                                path: normalizedPath,
                                filename: fileName,
                                lastModified: file.LastModified,
                                size: file.Size
                            }]
                    };
                    yield builds_1.BuildManager.detectDefaultFile(build);
                    console.log("Found build ", build.buildNumber, build.buildVersion, build.buildCommit);
                    buildManager.builds[buildManager.site.productionChannelName].push(build);
                    existingHashes.set(commitHash, build);
                }
                yield SiteManager.saveIndex();
            }
            yield SiteManager.saveIndex();
            console.log("Finished Indexing Process");
            SiteManager.currentlyIndexing = false;
            SiteManager.lastIndexTime = Date.now();
        });
    }
    static getPosition(string, subString, index) {
        return string.split(subString, index).join(subString).length;
    }
    static attemptMatch(host) {
        if (host.includes("localhost")) {
            return SiteManager.sites[0];
        }
        let site = SiteManager.sites.find(s => host.includes(s.domain));
        if (site) {
            return site;
        }
        return undefined;
    }
}
exports.SiteManager = SiteManager;
SiteManager.buildIndexPath = ".hermod/index.json";
SiteManager.loadedIndex = false;
SiteManager.sites = [];
SiteManager.buildManagers = [];
SiteManager.lastIndexTime = 0;
SiteManager.currentlyIndexing = false;
SiteManager.indexInterval = 1000 * 60 * 10;
SiteManager.minimumIndexInterval = 1000 * 15;
//# sourceMappingURL=sites.js.map