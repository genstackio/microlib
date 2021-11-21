import {replaceVars} from "./utils";

export const upper = () => v => `${v}`.toUpperCase();
export const lower = () => v => `${v}`.toLowerCase();
export const jsonParse = () => v => v ? JSON.parse(v) : undefined;
export const s3file_content = () => async v => v ? require('@ohoareau/aws').s3.getFileContent(v) : undefined;
export const s3file_hash = ({algorithm = 'md5'}) => async v => v ? require('./services/crypto').default.hash(await require('@ohoareau/aws').s3.getFileContent(v), algorithm) : undefined;
export const s3file_fingerprint = ({algorithm = 'sha256'}) => async v => v ? require('./services/crypto').default.hash(await require('@ohoareau/aws').s3.getFileContent(v), algorithm) : undefined;
export const s3file_url = () => async v => v ? (await require('@ohoareau/aws').s3.getFileViewUrl(v)).viewUrl : undefined;
export const s3file_url_infos = () => async v => v ? require('@ohoareau/aws').s3.getFileViewUrl(v) : undefined;
export const s3file_url_view = () => async v => v ? (await require('@ohoareau/aws').s3.getFileViewUrl(v)).viewUrl : undefined;
export const s3file_url_view_infos = () => async v => v ? require('@ohoareau/aws').s3.getFileViewUrl(v) : undefined;
export const s3file_url_dl = () => async v => v ? (await require('@ohoareau/aws').s3.getFileDownloadUrl(v)).downloadUrl : undefined;
export const s3file_url_dl_infos = () => async v => v ? require('@ohoareau/aws').s3.getFileDownloadUrl(v) : undefined;
export const s3file_url_ul = () => async v => v ? (await require('@ohoareau/aws').s3.getFileUploadUrl(v)).uploadUrl : undefined;
export const s3file_url_ul_infos = () => async v => v ? require('@ohoareau/aws').s3.getFileUploadUrl(v) : undefined;
export const image = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    if (!x.available) {
        const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const incomingName = (query?.aliases || {})[attribute] || attribute;
    const selection = (query?.selections || {})[incomingName] || {};
    const selected = Object.keys(selection);
    const s3 = require('@ohoareau/aws').s3;
    const cdnObject = (x.available && process.env.PUBLIC_IMAGE_BUCKET_NAME)
        ? {
            bucket: process.env.PUBLIC_IMAGE_BUCKET_NAME || undefined,
            key: process.env.PUBLIC_IMAGE_BUCKET_NAME ? await buildPublicImageBucketKey(v['fingerprint']) : undefined,
            contentType: v['contentType'],
            name: v['name'],
        }
        : {}
    ;
    const vv = x.available ? {
        bucket: cdnObject.bucket || v['bucket'],
        key: cdnObject.key || v['key'],
        contentType: v['contentType'],
        name: v['name'],
    } : {
        bucket: archiveBucket,
        key: archiveKey,
        name: archiveName,
    };
    if (x.available) {
        await Promise.all(selected.map(async k => {
            switch (k) {
                case 'bucket': x['bucket'] = v['bucket']; break;
                case 'cdnBucket': x['cdnBucket'] = cdnObject['bucket']; break;
                case 'key': x['key'] = v['key']; break;
                case 'cdnKey': x['cdnKey'] = cdnObject['key']; break;
                case 'name': x['name'] = v['name']; break;
                case 'contentType': x['contentType'] = v['contentType']; break;
                case 'fingerprint': x['fingerprint'] = v['fingerprint']; break;
                case 'content': x['content'] = await s3.getFileContent(vv); break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = (await s3.getFileViewUrl(vv)).viewUrl; break;
                case 'urlInfos': x['urlInfos'] = await s3.getFileViewUrl(vv); break;
                case 'viewUrl': x['viewUrl'] = (await s3.getFileViewUrl(vv)).viewUrl; break;
                case 'viewUrlInfos': x['viewUrlInfos'] = await s3.getFileViewUrl(vv); break;
                case 'downloadUrl': x['downloadUrl'] = (await s3.getFileDownloadUrl(vv)).downloadUrl; break;
                case 'downloadUrlInfos': x['downloadUrlInfos'] = await s3.getFileDownloadUrl(vv); break;
                case 'uploadUrl': x['uploadUrl'] = (await s3.getFileUploadUrl(vv)).uploadUrl; break;
                case 'uploadUrlInfos': x['uploadUrlInfos'] = await s3.getFileUploadUrl(vv); break;
                case 'size':
                case 'realContentType':
                case 'eTag':
                case 'lastModified':
                    const metadata = await s3.getFileMetadata(vv);
                    switch (k) {
                        case 'size': x['size'] = metadata.contentLength; break;
                        case 'realContentType': x['realContentType'] = metadata.contentType; break;
                        case 'eTag': x['eTag'] = metadata.eTag; break;
                        case 'lastModified': x['lastModified'] = metadata.lastModified.getTime(); break;
                        default: break;
                    }
                    break;
                default: break;
            }
        }));
    } else {
        await Promise.all(selected.map(async k => {
            switch (k) {
                case 'bucket': x['bucket'] = vv['bucket']; break;
                case 'key': x['key'] = vv['key']; break;
                case 'name': x['name'] = vv['name']; break;
                case 'uploadUrl': x['uploadUrl'] = (await s3.getFileUploadUrl(vv)).uploadUrl; break;
                case 'uploadUrlInfos': x['uploadUrlInfos'] = await s3.getFileUploadUrl(vv); break;
                default: break;
            }
        }));
    }
    return v;
}

function buildPublicImageBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}

function buildImageCdnUrl({name = undefined, fingerprint}: {name?: string, fingerprint: string}, options = {} as {arguments?: any}) {
    if (!process.env.IMAGE_CDN_URL_PATTERN) return undefined;

    const params = {} as {qs?: string, color?: string, filter?: string[], flip?: string, format?: string, preset?: string[], quality?: string, radius?: string, rotation?: string, size?: string, theme?: string, trim?: string};

    let qs = '';

    options.arguments?.name && (name = options.arguments?.name);
    options.arguments?.qs && (qs = `${options.arguments?.qs}`);
    options.arguments?.color && (params.color = `${options.arguments?.color}`);
    options.arguments?.filter && (params.filter = options.arguments?.filter.split(/\*,\*/g).map(x => `${x}`));
    options.arguments?.flip && (params.flip = `${options.arguments?.flip}`);
    options.arguments?.format && (params.format = `${options.arguments?.format}`);
    options.arguments?.preset && (params.preset = options.arguments?.preset.split(/\*,\*/g).map(x => `${x}`));
    options.arguments?.quality && (params.quality = `${options.arguments?.quality}`);
    options.arguments?.radius && (params.radius = `${options.arguments?.radius}`);
    options.arguments?.rotation && (params.rotation = `${options.arguments?.rotation}`);
    options.arguments?.size && (params.size = `${options.arguments?.size}`);
    options.arguments?.theme && (params.theme = `${options.arguments?.theme}`);
    options.arguments?.trim && (params.trim = `${options.arguments?.trim}`);

    const u = process.env.IMAGE_CDN_URL_PATTERN
        .replace('{{fingerprint}}', fingerprint)
        .replace('{{name}}', name || '')
        .replace('{{path}}', `${fingerprint}/${name}`)
    ;
    if (!Object.keys(params).length && !qs) return u;
    const keys = Object.keys(params);
    keys.sort();
    let xx;
    const queryString = keys.reduce((acc, k) => {
        xx = buildQueryStringValuesParam(k, params[k]);
        if (!xx) return acc;
        acc = `${acc}${acc ? '&' : ''}${xx}`;
        return acc;
    }, qs);
    return `${u}?${queryString}`;
}

function buildQueryStringValuesParam(k, v) {
    if (Array.isArray(v)) {
        switch (v.length) {
            case 0: return undefined;
            case 1: return `${k}=${v[0]}`;
            default:
                return v.reduce((acc, vv) => {
                    acc = `${acc}${acc ? '&' : ''}${k}[]${vv}`;
                    return acc;
                }, '');
        }
    }
    if ((undefined === v) || ('' === v)) return undefined;
    return `${k}=${v}`;
}