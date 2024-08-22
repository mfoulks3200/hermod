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
            region: process.env.AWS_REGION,
        });
        AWS.instance = this;
    }

    public async listFiles(path: string) {
        const resp = await this.s3Client.send(new ListObjectsCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: path
        }));
        return resp;
    }

    public async fileExists(path: string) {
        try {
            await this.s3Client.send(new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: path
            }));
            return true;
        } catch (e) {
            return false;
        }
    }

    public async getFile(path: string) {
        return await this.s3Client.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: path
        }));
    }

    public async getSignedLink(path: string) {
        return getSignedUrl(this.s3Client, new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: path
        }), { expiresIn: 3600 });
    }

    public async writeFile(path: string, data: string) {
        const resp = await this.s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: path,
            Body: data
        }));
        return resp;
    }

}
