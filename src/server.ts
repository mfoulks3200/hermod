import express from 'express'
import { SiteManager } from './sites';
import { Response } from 'express-serve-static-core';
import { Router } from './router';
import cookieParser from 'cookie-parser';


export class Server {
    public app = express();
    public port = process.env.PORT ?? 80;

    constructor() {
        this.app.use(cookieParser());

        this.app.get('/[\$]hermod/builds', async (req, res) => {
            const host = req.get('host');
            if (!SiteManager.isLoaded()) {
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
        })

        this.app.get('/*', async (req, res) => {
            const host = req.get('host');
            const path = req.baseUrl + req.path;

            if (!SiteManager.isLoaded()) {
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
        })

        this.app.listen(this.port, () => {
            console.log(`Example app listening on port ${this.port}`)
        })
    }

    public static sendJsonObject(res: Response<any, Record<string, any>, number>, obj: any) {
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(JSON.stringify(obj));
    }
}