"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const server_1 = require("./server");
const node_path_1 = __importDefault(require("node:path"));
const sites_1 = require("./sites");
const aws_1 = require("./aws");
const package_json_1 = __importDefault(require("../package.json"));
console.log("Hermod Version " + package_json_1.default.version);
new config_1.Config(node_path_1.default.join(__dirname, '../..', 'config.json'));
new aws_1.AWS();
sites_1.SiteManager.initialize(config_1.Config.current);
const server = new server_1.Server();
//# sourceMappingURL=main.js.map