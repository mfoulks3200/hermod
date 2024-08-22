import {
    GetObjectCommand,
    ListBucketsCommand,
    ListObjectsCommand,
    PutObjectCommand,
    S3Client,
    WriteGetObjectResponseCommand
} from "@aws-sdk/client-s3";
import { Config } from "./config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class AWS {

    public static instance: AWS;
    private s3Client: S3Client;

    constructor() {
        this.s3Client = new S3Client({
            region: Config.current.s3Region,
        });
        AWS.instance = this;
    }

    public async listFiles(path: string) {
        const resp = await this.s3Client.send(new ListObjectsCommand({
            Bucket: Config.current.s3Bucket,
            Prefix: path
        }));
        return resp;
    }

    public async fileExists(path: string) {
        try {
            await this.s3Client.send(new GetObjectCommand({
                Bucket: Config.current.s3Bucket,
                Key: path
            }));
            return true;
        } catch (e) {
            return false;
        }
    }

    public async getFile(path: string) {
        return await this.s3Client.send(new GetObjectCommand({
            Bucket: Config.current.s3Bucket,
            Key: path
        }));
    }

    public async getSignedLink(path: string) {
        return getSignedUrl(this.s3Client, new GetObjectCommand({
            Bucket: Config.current.s3Bucket,
            Key: path
        }), { expiresIn: 3600 });
    }

    public async writeFile(path: string, data: string) {
        const resp = await this.s3Client.send(new PutObjectCommand({
            Bucket: Config.current.s3Bucket,
            Key: path,
            Body: data
        }));
        return resp;
    }

}
