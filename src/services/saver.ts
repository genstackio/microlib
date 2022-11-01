import {s3} from "@ohoareau/aws";
import fetcher from "./fetcher";

async function save({bucket, key, content, contentType, fingerprint, name}: {bucket: string, key: string, content: any, contentType: string, fingerprint: string, name: string}) {
    return s3.setFile({bucket, key, contentType}, content);
}

async function saveFrom(from: any, {bucket, key, contentType, name, algorithm}) {
    const {bucket: origBucket, key: origKey} = from || {}; // if origin is s3 bucket file, we need to avoid to rewrite the file if the target is the same bucket/key
    const {content, contentType: detectedContentType} = await fetcher.fetch(from);
    contentType = contentType || detectedContentType;
    const fingerprint = await computeContentFingerprint(content, {algorithm});
    const to = {bucket, key, contentType, fingerprint, name};
    if (!origBucket || !origKey || (bucket !== origBucket) || (key !== origKey)) {
        await save({content, ...to});
    }
    return to;
}

async function computeContentFingerprint(content: any, {algorithm = 'sha256'}: {algorithm?: string} = {}) {
    return require('./crypto').default.hash(content, algorithm)
}

const saver = {
    save,
    saveFrom,
};

// noinspection JSUnusedGlobalSymbols
export default saver;