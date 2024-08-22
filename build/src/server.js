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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express_1 = __importDefault(require("express"));
const sites_1 = require("./sites");
const router_1 = require("./router");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = 80;
        this.app.use((0, cookie_parser_1.default)());
        this.app.get('/index', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const host = req.get('host');
            console.log(`Request received from ${host}`);
            res.header("Content-Type", 'application/json');
            res.send(JSON.stringify(sites_1.SiteManager.serializeIndex()));
        }));
        this.app.get('/*', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const host = req.get('host');
            const path = req.baseUrl + req.path;
            if (!sites_1.SiteManager.isLoaded()) {
                const match = sites_1.SiteManager.attemptMatch(host !== null && host !== void 0 ? host : "");
                if (match) {
                    new router_1.Router(match).resolvePath(path, req, res);
                }
                else {
                    res.status(200);
                    res.send(`${host} is not configured.`);
                    sites_1.SiteManager.startIndexingProcess();
                }
            }
            else {
                res.status(500);
                res.send("ERROR: 500 Could not load index.");
            }
        }));
        this.app.listen(this.port, () => {
            console.log(`Example app listening on port ${this.port}`);
        });
    }
    static sendJsonObject(res, obj) {
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(JSON.stringify(obj));
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map