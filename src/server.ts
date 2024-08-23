import express from 'express'
import { SiteManager } from './sites';
import { Router } from './router';
import { Request, Response } from 'express-serve-static-core';
import { ParsedQs } from "qs";
import cookieParser from 'cookie-parser';

export type ExpressRequest = Request<{}, any, any, ParsedQs, Record<string, any>>;
export type ExpressReponse = Response<any, Record<string, any>, number>;

export class Server {
    public app = express();
    public port = process.env.HERMOD_PORT ?? 80;

    constructor() {
        this.app.use(cookieParser());

        this.app.get('/-hermod/healthcheck', async (req, res) => {
            Server.sendCORSHeaders(res);
            res.status(SiteManager.isLoaded() ? 200 : 500);
            res.send(SiteManager.isLoaded() ? "OK" : "ERROR");
            res.end();
            Server.requestLogger(req, res);
        });

        this.app.get('/-hermod/builds', async (req, res) => {
            Server.sendCORSHeaders(res);
            const host = req.get('host');
            if (SiteManager.isLoaded()) {
                const match = SiteManager.attemptMatch(host ?? "");
                if (match) {
                    let buildManager = SiteManager.buildManagers.find(bm => bm.site.siteId === match.siteId);
                    Server.sendJsonObject(res, buildManager?.serializeSanitizedBuildChannels());
                    res.end();
                }
            }
            if (!res.writableEnded) {
                res.status(500);
                res.send("ERROR: 500 Could not load index.");
            }
            Server.requestLogger(req, res);
        })

        this.app.get('/*', async (req, res) => {
            const host = req.get('host');
            const path = req.baseUrl + req.path;

            if (SiteManager.isLoaded()) {
                const match = SiteManager.attemptMatch(host ?? "");
                if (match) {
                    new Router(match).resolvePath(path, req, res)
                } else {
                    res.status(200);
                    res.send(`${host} is not configured.`);
                    SiteManager.startIndexingProcess();
                }
            } else {
                res.status(500);
                res.send("ERROR: 500 Could not load index.");
            }
            Server.requestLogger(req, res);
        })

        this.app.listen(this.port, () => {
            console.log(`Example app listening on port ${this.port}`)
        })
    }

    public static requestLogger(req: Request, res: Response) {
        const host = req.get('host');
        const { cookie, authorization, ...headers } = req.headers;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            method: req.method,
            requestIp: req.ip,
            host: host,
            path: req.path,
            status: res.statusCode,
            headers: headers
        }));
    }

    public static sendCORSHeaders(res: Response) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }

    public static sendJsonObject(res: Response<any, Record<string, any>, number>, obj: any) {
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(JSON.stringify(obj));
    }
}