"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
class Config {
    constructor(path) {
        Config.current = JSON.parse(node_fs_1.default.readFileSync(path, 'utf8'));
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map