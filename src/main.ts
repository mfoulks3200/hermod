import { Config } from "./config";
import { Server } from "./server";
import path from 'node:path';
import { SiteManager } from "./sites";
import { AWS } from "./aws";
import packageJson from "../package.json";

console.log("Hermod Version " + packageJson.version);

new Config(path.join(__dirname, '../..', 'config.json'));
new AWS();
SiteManager.initialize(Config.current);

const server = new Server();