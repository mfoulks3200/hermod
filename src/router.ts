import { AWS } from "./aws";
import { SiteConfig } from "./config";
import { SiteManager } from "./sites";
import { ExpressReponse, ExpressRequest } from "./server";

type OverrideType = "channel" | "version" | "build" | "hash";
const OverrideTypes: OverrideType[] = ["channel", "version", "build", "hash"];

interface RouterOverrides {
    channel?: string;
    version?: string;
    build?: string;
    hash?: string;
}

export class Router {

    private site: SiteConfig;
    private overrides: RouterOverrides = {};

    constructor(site: SiteConfig) {
        this.site = site;
    }

    private checkHermodFlags(req: ExpressRequest, res: ExpressReponse) {
        const query = req.query;
        if (query["hermod-override"]) {
            this.evaluateOverrides(query["hermod-override"].toString());
            if (this.findMatchingBuild()) {
                const overrideStr = this.overridesToString();
                if (overrideStr.length > 0) {
                    res.cookie("hermod-override", this.overridesToString());
                } else {
                    res.clearCookie("hermod-override");
                }
                const path = req.baseUrl + req.path;
                const remainingQuery = req.query
                delete remainingQuery["hermod-override"];
                let queryString = "";
                if (Object.keys(remainingQuery).length > 0) {
                    queryString = "?" + Object.keys(remainingQuery).map(k => `${k}=${remainingQuery[k]}`).join("&");
                }
                res.redirect(path + queryString);
                res.end();
            }
        }
        if (req.cookies["hermod-override"]) {
            const overrideStr = decodeURIComponent(req.cookies["hermod-override"]);
            console.log(overrideStr);
            this.evaluateOverrides(overrideStr);
        }
    }

    private evaluateOverrides(overrideStr: string) {
        const override = overrideStr.toString();
        if (override === "clear") {
            this.overrides = {};
            return;
        }
        for (let overrideSegment of override.split(",")) {
            if (overrideSegment.split(":").length == 2) {
                const components = overrideSegment.split(":");
                const oType: OverrideType = components[0].trim().toLowerCase() as OverrideType;
                if (OverrideTypes.includes(oType)) {
                    this.overrides[oType] = components[1];
                }
            }
        }
    }

    private overridesToString(): string {
        let str = [];
        for (let key of Object.keys(this.overrides)) {
            str.push(`${key}:${this.overrides[key as OverrideType]}`);
        }
        return str.join(",");
    }

    public async resolvePath(path: string, req: ExpressRequest, res: ExpressReponse) {
        this.checkHermodFlags(req, res);
        if (res.writableEnded) {
            return;
        }
        const resolvedPath = this.getPath(path);
        if (resolvedPath) {
            const file = await AWS.instance.getFile(resolvedPath);
            res.status(200);
            res.setHeader("Content-Type", file.ContentType!);
            res.setHeader("Content-Length", file.ContentLength!.toString());
            res.setHeader("Last-Modified", file.LastModified!.toUTCString());
            const fileBytes = await file.Body!.transformToByteArray();
            res.write(fileBytes);
            res.end();
        } else {
            res.status(404);
            res.send(`${req.get('host')} is not configured.`);
        }
    }

    private findMatchingBuild() {
        let channel = this.overrides.channel ?? this.site.productionChannelName;
        let buildManager = SiteManager.buildManagers.find(bm => bm.site.siteId === this.site.siteId);
        if (buildManager) {
            let build;
            if (this.overrides.version) {
                build = buildManager.builds[channel].find(b => b.buildVersion === this.overrides.version);
            } else if (this.overrides.build && !isNaN(parseInt(this.overrides.build))) {
                build = buildManager.builds[channel].find(b => b.buildNumber === parseInt(this.overrides.build!));
            } else if (this.overrides.hash) {
                build = buildManager.builds[channel].find(b => b.buildCommit === this.overrides.hash);
            }
            if (!build) {
                build = buildManager.getMostRecentBuild(channel);
            }
            if (build) {
                return build;
            }
        }
    }

    public getRootPath() {
        const matchingBuild = this.findMatchingBuild();
        if (matchingBuild) {
            return matchingBuild.pathRoot;
        }
    }

    public getPath(path: string) {
        const matchingBuild = this.findMatchingBuild();
        if (matchingBuild) {
            if (path.length == 1) {
                return matchingBuild.defaultFile;
            }
            if (matchingBuild.files.find(f => f.path == path.substring(1))) {
                return `${matchingBuild.pathRoot}${path}`;
            } else {
                return matchingBuild.defaultFile;
            }
        }
    }
}