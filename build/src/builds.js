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
exports.BuildManager = void 0;
const aws_1 = require("./aws");
class BuildManager {
    constructor(site) {
        this.builds = {};
        this.site = site;
        this.initIndex();
    }
    initIndex() {
        this.builds[this.site.productionChannelName] = [];
        this.builds[this.site.stagingChannelName] = [];
    }
    getMostRecentBuild(channel) {
        const builds = this.builds[channel].sort((a, b) => a.buildNumber - b.buildNumber);
        return builds[builds.length - 1];
    }
    static detectDefaultFile(build) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield aws_1.AWS.instance.listFiles(build.pathRoot + "/index");
            if (files.Contents) {
                build.defaultFile = files.Contents[0].Key;
                return files.Contents[0].Key;
            }
            build.defaultFile = build.pathRoot;
            return build.pathRoot;
        });
    }
    static deserializeBuild(build, site) {
        const bm = new BuildManager(site);
        bm.builds = build;
        return bm;
    }
}
exports.BuildManager = BuildManager;
//# sourceMappingURL=builds.js.map