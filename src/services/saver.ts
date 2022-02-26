import {s3} from "@ohoareau/aws";
import fetcher from "./fetcher";

async function save({bucket, key, content, contentType, fingerprint, name}: {bucket: string, key: string, content: any, contentType: string, fingerprint: string, name: string}) {
    return s3.setFile({bucket, key, contentType}, content);
}

async function saveFrom(from: any, {bucket, key, contentType, name, algorithm}) {
    const {content, contentType: detectedContentType} = await fetcher.fetch(from);
    contentType = contentType || detectedContentType;
    const fingerprint = await computeContentFingerprint(content, {algorithm});
    const to = {bucket, key, content, contentType, fingerprint, name};
    await save(to);
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