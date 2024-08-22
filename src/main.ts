import { Config } from "./config";
import { Server } from "./server";
import path from 'node:path';
import { SiteManager } from "./sites";
import { AWS } from "./aws";
import packageJson from "../package.json";

console.log("Hermod Version " + packageJson.version);

const configPath = process.env.ENV_CONTEXT == "DEV" ?
    path.join(__dirname, '../..', 'config.json') :
    path.join('/', 'config', 'config.json');

new Config(configPath);
new AWS();
SiteManager.initialize(Config.current);

const server = new Server();