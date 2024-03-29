import {buildGqlSelectionInfos, replaceVars} from "./utils";
import {mConverterError} from "./m";

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
export const chart = ({attribute, urlPattern, prefix, idPrefix, tokenPrefix}) => async (v, result, query) => {
    const x = {};
    const vars = {
        ...query, ...(query.oldData || {}), ...(query.data || {}), ...result,
    };

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);

    v = {
        fingerprint: 'a01de45cad870bca43',
        contentType: 'image/png',
        ...v,
    };

    await Promise.all(selected.map(async k => {
        switch (k) {
            case 'json': x['json'] =  await buildChartJsonFromParams(vars, {prefix, idPrefix, tokenPrefix}); break;
            case 'contentType': x['contentType'] =  v['contentType']; break;
            case 'url': x['url'] = buildUrlFromPattern(urlPattern, vars, v, selection?.arguments?.url); break;
            default: break;
        }
    }));

    return x;
}

async function buildChartJsonFromParams(vars: any, {prefix, idPrefix, tokenPrefix}: {prefix?: string, idPrefix?: string, tokenPrefix?: string}) {
    return {}; // @todo
}
export const image = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute, urlPattern}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    if (!x.available) {
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);
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
                case 'contentAsBase64': x['contentAsBase64'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64'); break;
                case 'contentAsBase64Url': x['contentAsBase64Url'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64url'); break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = urlPattern ? buildUrlFromPattern(urlPattern, vars, v, selection?.arguments?.url) : (await s3.getFileViewUrl(vv)).viewUrl; break;
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
    return x;
}

export const css = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute, urlPattern}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    if (!x.available) {
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);
    const s3 = require('@ohoareau/aws').s3;
    const cdnObject = (x.available && process.env.PUBLIC_CSS_BUCKET_NAME)
        ? {
            bucket: process.env.PUBLIC_CSS_BUCKET_NAME || undefined,
            key: process.env.PUBLIC_CSS_BUCKET_NAME ? await buildPublicCssBucketKey(v['fingerprint']) : undefined,
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
                case 'contentAsBase64': x['contentAsBase64'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64'); break;
                case 'contentAsBase64Url': x['contentAsBase64Url'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64url'); break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = urlPattern ? buildUrlFromPattern(urlPattern, vars, v) : (await s3.getFileViewUrl(vv)).viewUrl; break;
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
    return x;
}

export const js = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute, urlPattern}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    if (!x.available) {
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);
    const s3 = require('@ohoareau/aws').s3;
    const cdnObject = (x.available && process.env.PUBLIC_JS_BUCKET_NAME)
        ? {
            bucket: process.env.PUBLIC_JS_BUCKET_NAME || undefined,
            key: process.env.PUBLIC_JS_BUCKET_NAME ? await buildPublicJsBucketKey(v['fingerprint']) : undefined,
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
                case 'contentAsBase64': x['contentAsBase64'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64'); break;
                case 'contentAsBase64Url': x['contentAsBase64Url'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64url'); break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = urlPattern ? buildUrlFromPattern(urlPattern, vars, v) : (await s3.getFileViewUrl(vv)).viewUrl; break;
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
    return x;
}

export const jsonFile = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute, urlPattern}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    if (!x.available) {
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);
    const s3 = require('@ohoareau/aws').s3;
    const cdnObject = (x.available && process.env.PUBLIC_JSON_BUCKET_NAME)
        ? {
            bucket: process.env.PUBLIC_JSON_BUCKET_NAME || undefined,
            key: process.env.PUBLIC_JSON_BUCKET_NAME ? await buildPublicJsonBucketKey(v['fingerprint']) : undefined,
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
                case 'contentAsBase64': x['contentAsBase64'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64'); break;
                case 'contentAsBase64Url': x['contentAsBase64Url'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64url'); break;
                case 'contentAsJson':
                    try {
                        x['contentAsJson'] = await s3.fromJsonFile(vv.bucket, vv.key);
                    } catch(e2: any) {
                        await mConverterError(e2, 'jsonFile', {data: {source: 's3', format: 'json', bucket: vv.bucket, key: vv.key}});
                        x['contentAsJson'] = {status: 'error', message: e2.message};
                    }
                    break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = urlPattern ? buildUrlFromPattern(urlPattern, vars, v) : (await s3.getFileViewUrl(vv)).viewUrl; break;
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
    return x;
}

export const file = ({bucket: archiveBucket, key: archiveKey, name: archiveName, attribute, urlPattern}) => async (v, result, query) => {
    const x = {available: false};
    if (v && v.fingerprint) x.available = true;
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    if (!x.available) {
        archiveBucket = replaceVars(archiveBucket, vars)
        archiveKey = replaceVars(archiveKey, vars);
        archiveName = archiveName ? replaceVars(archiveName, vars) : undefined;
    }

    const [selection, selected] = buildGqlSelectionInfos(query, attribute);
    const s3 = require('@ohoareau/aws').s3;
    const cdnObject = (x.available && process.env.PUBLIC_FILE_BUCKET_NAME)
        ? {
            bucket: process.env.PUBLIC_FILE_BUCKET_NAME || undefined,
            key: process.env.PUBLIC_FILE_BUCKET_NAME ? await buildPublicFileBucketKey(v['fingerprint']) : undefined,
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
                case 'contentAsBase64': x['contentAsBase64'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64'); break;
                case 'contentAsBase64Url': x['contentAsBase64Url'] = Buffer.from(await s3.getFileContent(vv), 'utf-8').toString('base64url'); break;
                case 'contentAsJson':
                    try {
                        x['contentAsJson'] = await s3.fromJsonFile(vv.bucket, vv.key);
                    } catch(e2: any) {
                        await mConverterError(e2, 'file', {data: {source: 's3', format: 'json', bucket: vv.bucket, key: vv.key}});
                        x['contentAsJson'] = {status: 'error', message: e2.message};
                    }
                    break;
                case 'cdnUrl': x['cdnUrl'] = cdnObject ? await buildImageCdnUrl({...(cdnObject || {}), fingerprint: v['fingerprint']} as any, selection[k]) : undefined; break;
                case 'url': x['url'] = urlPattern ? buildUrlFromPattern(urlPattern, vars, v) : (await s3.getFileViewUrl(vv)).viewUrl; break;
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
    return x;
}

function buildScreenshotInfos(vars: any, v: any, kind: string, key: string, mode: string, format: string = 'png') {
    return {
        url: buildUrlFromPattern(`[[process.env.API_SCREENSHOT_ENDPOINT]]/${kind}/${key}/${mode}/${mode}.${format}`, vars, v),
        fullscreenUrl: buildUrlFromPattern(`[[process.env.API_SCREENSHOT_ENDPOINT]]/${kind}/${key}/${mode}/${mode}-fullscreen.${format}?full`, vars, v),
    }
}
export const screenshots = ({kind, key, format, attribute}) => async (v, result, query) => {
    const x = {};
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {}), ...result};
    const [_, selected] = buildGqlSelectionInfos(query, attribute);
    await Promise.all(selected.map(async k => {
        x[k] = buildScreenshotInfos(vars, v, kind, key, k, format);
    }));
    return x;
}

function buildUrlFromPattern(pattern: string, vars: any, dynamicVars: any, args: any = {}) {
    dynamicVars = {
        extension: (args['format'] ? `.${args['format']}` : undefined) || computeExtensionFromContentType((dynamicVars || {})['contentType']),
        ...(dynamicVars || {}),
    };
    pattern = replaceVars(pattern, vars);
    return replaceVars(pattern, dynamicVars || {}, '\\<\\<', '\\>\\>');
}
const extensionMap = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/gif': '.gif',
    'image/ief': '.ief',
    'image/bmp': '.bmp',
    'image/tiff': '.tif',
    'application/octet-stream': '',
    'application/json': '.json',
    'text/javascript': '.js',
    'text/css': '.css',
    'text/csv': '.csv',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/rtf': '.rtf',

}
function computeExtensionFromContentType(type: string|undefined) {
    return extensionMap[type || ''] || '';
}
function buildPublicImageBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}
function buildPublicCssBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}
function buildPublicJsBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}
function buildPublicJsonBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}
function buildPublicFileBucketKey(key) {
    const parts = key.split('', 10);
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, 1);
    return `${parts.join('/')}/${key}`;
}

function buildImageCdnUrl({name = undefined, fingerprint}: {name?: string, fingerprint: string}, options = {} as {arguments?: any}) {
    if (!process.env.IMAGE_CDN_UP) return undefined;

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

    const u = process.env.IMAGE_CDN_UP
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