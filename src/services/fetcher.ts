import {Readable} from "stream";

const allowedBucketsForFetching = (process.env.FETCHABLE_BUCKET_NAMES || '').split(/\s*,\s*/g).filter(x => !!x).reduce((acc, k) => Object.assign(acc, {[k]: true}), {});

type bucket_fetch_params = {
    bucket: string,
    key: string,
}
type url_fetch_params = {
    url: string,
    method?: string,
    headers?: any,
    body?: any,
}
type api_url_fetch_params = {
    apiUrl: string,
    method?: string,
    headers?: any,
    body?: any,
    dataKey?: string;
}
type content_fetch_params = {
    content: any;
}
type fetch_params = Partial<bucket_fetch_params> & Partial<url_fetch_params> & Partial<content_fetch_params> & Partial<api_url_fetch_params>;

async function fetch({bucket, key, url, method, headers, apiUrl, body, dataKey, content}: fetch_params) {
    if (bucket) return fetchFromBucket({bucket, key: key!});
    if (url) return fetchFromUrl({url, method, headers, body});
    if (apiUrl) return fetchFromApi({apiUrl, method, headers, body, dataKey});
    if (content) return fetchFromContent({content});
    throw new Error(`Neither bucket/key, nor url, nor content specified for fetching`);
}

async function fetchFromBucket({bucket, key}: {bucket: string, key: string}): Promise<{content: Buffer|Uint8Array|Blob|string|Readable, contentType: string|undefined}> {
    return {
        content: await require('@ohoareau/aws').s3.getFileContent({bucket, key}),
        contentType: undefined,
    };
}

async function extractBucketObjectInfosIfKnownBucket(url: string): Promise<undefined|{bucket: string, key: string, region?: string}> {
    try {
        const u = new (require('url').URL)(url);
        let detectedBucketObjectInfos: any = undefined;
        if (u.protocol === 'https') {
            switch (true) {
                case /^s3.([^.]+).amazonaws.com/i.test(u.hostname):
                    detectedBucketObjectInfos = {
                        region: u.replace(/^s3.([^.]+).amazonaws.com/i, '$1'),
                        bucket: u.pathname.slice(1).split(/\//g)[0],
                        key: u.pathname.slice(1).split(/\//g).slice(1).join('/'),
                    };
                    break;
                case /^([^.]+).s3.([^.]+).amazonaws.com/i.test(u.hostname):
                    detectedBucketObjectInfos = {
                        bucket: u.replace(/^([^.]+).s3.([^.]+).amazonaws.com/i, '$1'),
                        region: u.replace(/^([^.]+).s3.([^.]+).amazonaws.com/i, '$2'),
                        key: u.pathname.slice(1),
                    };
                    break;
                default:
                    return undefined;
            }
        } else if (u.protocol === 's3') {
            detectedBucketObjectInfos = {
                bucket: u.hostname,
                key: u.pathname.slice(1),
            }
        } else {
            return undefined;
        }
        if (!detectedBucketObjectInfos) return undefined;
        if (!allowedBucketsForFetching[detectedBucketObjectInfos.bucket]) return undefined;
        return detectedBucketObjectInfos;
    } catch (e) {
        return undefined;
    }
}
async function fetchFromUrl({url, method = 'GET', headers = {}, body = undefined}: {url: string, method?: string, headers?: any, body?: any}): Promise<{content: Buffer|Uint8Array|Blob|string|Readable, contentType: string|undefined}> {
    const bucketObjectInfos = await extractBucketObjectInfosIfKnownBucket(url);
    if (!!bucketObjectInfos) return fetchFromBucket(bucketObjectInfos);
    const http = require('./services/http').default;
    const res = await http.request(url, method, body, headers);
    if ((200 > res.status) || (300 <= res.status)) {
        throw new Error(`Unable to fetch from url '${url}' (status code: ${res.status}'`);
    }
    return {
        content: await res.buffer(),
        contentType: res.headers['content-type'] || undefined,
    };
}
async function fetchFromApi({apiUrl, method = 'GET', body = undefined, headers = {}, dataKey = 'url'}: {apiUrl: string, method?: string, headers?: any, body?: any, dataKey?: string}): Promise<{content: Buffer|Uint8Array|Blob|string|Readable, contentType: string|undefined}> {
    const http = require('./services/http').default;
    const res = await http.request(apiUrl, method, body, headers);
    if ((200 > res.status) || (300 <= res.status)) {
        throw new Error(`Unable to fetch from api url '${apiUrl}' (status code: ${res.status}'`);
    }
    const url = (await res.json())[dataKey];
    return fetchFromUrl({url});
}

const encodingMap = {
    base64: 'base64',
    base64url: 'base64url',
    utf8: 'utf8',
    'utf-8': 'utf-8',
    ascii: 'ascii',
    binary: 'binary',
    hex: 'hex',
    latin1: 'latin1',
    utf16le: 'utf16le',
    json: 'json',
    svg: 'svg',
    csv: 'csv',
}

async function fetchFromContent({content, encoding = 'base64'}: {content: any, encoding?: 'base64' | 'base64url' | 'utf'}): Promise<{content: Buffer, contentType}> {
    const enc = encodingMap[encoding || 'base64'];
    if (!enc) throw new Error(`Unsupported encoding (actual: '${encoding}', expected: ${Object.keys(encodingMap).join(', ')}`);
    switch(enc) {
        case 'json': return {
            content,
            contentType: 'application/json;charset=utf-8',
        }
        case 'svg': return {
            content,
            contentType: 'image/svg+xml',
        }
        case 'csv': return {
            content,
            contentType: 'text/csv',
        }
        default: return {
            content: Buffer.from(content, enc),
            contentType: undefined,
        }
    }
}

const fetcher = {
    fetch,
};

// noinspection JSUnusedGlobalSymbols
export default fetcher;