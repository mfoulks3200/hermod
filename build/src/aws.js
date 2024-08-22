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
exports.AWS = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("./config");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class AWS {
    constructor() {
        this.s3Client = new client_s3_1.S3Client({
            region: config_1.Config.current.s3Region,
        });
        AWS.instance = this;
    }
    listFiles(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.s3Client.send(new client_s3_1.ListObjectsCommand({
                Bucket: config_1.Config.current.s3Bucket,
                Prefix: path
            }));
            return resp;
        });
    }
    fileExists(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.s3Client.send(new client_s3_1.GetObjectCommand({
                    Bucket: config_1.Config.current.s3Bucket,
                    Key: path
                }));
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
    getFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: config_1.Config.current.s3Bucket,
                Key: path
            }));
        });
    }
    getSignedLink(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, new client_s3_1.GetObjectCommand({
                Bucket: config_1.Config.current.s3Bucket,
                Key: path
            }), { expiresIn: 3600 });
        });
    }
    writeFile(path, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: config_1.Config.current.s3Bucket,
                Key: path,
                Body: data
            }));
            return resp;
        });
    }
}
exports.AWS = AWS;
//# sourceMappingURL=aws.js.map