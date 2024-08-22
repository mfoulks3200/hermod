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
exports.Router = void 0;
const aws_1 = require("./aws");
const sites_1 = require("./sites");
const OverrideTypes = ["channel", "version", "build", "hash"];
class Router {
    constructor(site) {
        this.overrides = {};
        this.site = site;
    }
    checkHermodFlags(req, res) {
        const query = req.query;
        if (query["hermod-override"]) {
            this.evaluateOverrides(query["hermod-override"].toString());
            if (this.findMatchingBuild()) {
                const overrideStr = this.overridesToString();
                if (overrideStr.length > 0) {
                    res.cookie("hermod-override", this.overridesToString());
                }
                else {
                    res.clearCookie("hermod-override");
                }
                const path = req.baseUrl + req.path;
                const remainingQuery = req.query;
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
            this.evaluateOverrides(overrideStr);
        }
    }
    evaluateOverrides(overrideStr) {
        const override = overrideStr.toString();
        if (override === "clear") {
            this.overrides = {};
            return;
        }
        for (let overrideSegment of override.split(",")) {
            if (overrideSegment.split(":").length == 2) {
                const components = overrideSegment.split(":");
                const oType = components[0].trim().toLowerCase();
                if (OverrideTypes.includes(oType)) {
                    this.overrides[oType] = components[1];
                }
            }
        }
    }
    overridesToString() {
        let str = [];
        for (let key of Object.keys(this.overrides)) {
            str.push(`${key}:${this.overrides[key]}`);
        }
        return str.join(",");
    }
    resolvePath(path, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkHermodFlags(req, res);
            if (res.writableEnded) {
                return;
            }
            const resolvedPath = this.getPath(path);
            if (resolvedPath) {
                const file = yield aws_1.AWS.instance.getFile(resolvedPath);
                res.status(200);
                res.setHeader("Content-Type", file.ContentType);
                res.setHeader("Content-Length", file.ContentLength.toString());
                res.setHeader("Last-Modified", file.LastModified.toUTCString());
                const fileBytes = yield file.Body.transformToByteArray();
                res.write(fileBytes);
                res.end();
            }
            else {
                res.status(404);
                res.send(`${req.get('host')} is not configured.`);
            }
        });
    }
    findMatchingBuild() {
        var _a;
        let channel = (_a = this.overrides.channel) !== null && _a !== void 0 ? _a : this.site.productionChannelName;
        let buildManager = sites_1.SiteManager.buildManagers.find(bm => bm.site.siteId === this.site.siteId);
        if (buildManager) {
            let build;
            if (this.overrides.version) {
                build = buildManager.builds[channel].find(b => b.buildVersion === this.overrides.version);
            }
            else if (this.overrides.build && !isNaN(parseInt(this.overrides.build))) {
                build = buildManager.builds[channel].find(b => b.buildNumber === parseInt(this.overrides.build));
            }
            else if (this.overrides.hash) {
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
    getRootPath() {
        const matchingBuild = this.findMatchingBuild();
        if (matchingBuild) {
            return matchingBuild.pathRoot;
        }
    }
    getPath(path) {
        const matchingBuild = this.findMatchingBuild();
        if (matchingBuild) {
            if (path.length == 1) {
                return matchingBuild.defaultFile;
            }
            if (matchingBuild.files.find(f => f.path == path.substring(1))) {
                return `${matchingBuild.pathRoot}${path}`;
            }
            else {
                return matchingBuild.defaultFile;
            }
        }
    }
}
exports.Router = Router;
//# sourceMappingURL=router.js.map