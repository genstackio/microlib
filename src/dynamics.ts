import {replaceVars} from "./utils";

export const empty = () => () => '';
export const http = ({http}) => async data => {
    let [url, method = 'get', body = undefined, headers = undefined, options = undefined] = http.split(/::/g);
    url = replaceVars(url, data);
    body = body ? replaceVars(body, data) : undefined;
    headers = headers ? JSON.parse(replaceVars(headers, data)) : undefined;
    options = options ? JSON.parse(replaceVars(options, data)) : undefined;
    const res = await require('./services/http').default.request(url, method, body, headers, options);
    if (!res.ok) throw new Error(`Unable to fetch ${url}`);
    return res.json();
}
export const from = ({name}) => data => (data && name) ? data[name] : undefined
export const uuid = ({uuid = 'v4'}) => () => require('uuid')[uuid]();
export const value = ({value}) => data => {
    return 'string' === typeof value ? replaceVars(value, data) : value;
}
export const md5 = ({md5}) => data => require('./services/crypto').default.hash(replaceVars(md5 || '', data), 'md5');
export const sha1 = ({sha1}) => data => require('./services/crypto').default.hash(replaceVars(sha1 || '', data), 'sha1');
export const sha256 = ({sha256}) => data => require('./services/crypto').default.hash(replaceVars(sha256 || '', data), 'sha256');
export const sha512 = ({sha512}) => data => require('./services/crypto').default.hash(replaceVars(sha512 || '', data), 'sha512');
export const s3 = ({s3}) => async data => {
    let [bucket, key] = s3.split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    return require('@ohoareau/aws').s3.getFileContent({bucket, key});
}
export const s3url_dl = ({s3url_dl, s3url = undefined}) => async data => {
    let [bucket, key, name = undefined] = (s3url_dl || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    name = name ? replaceVars(name, data) : undefined;
    return (await require('@ohoareau/aws').s3.getFileDownloadUrl({bucket, key, name})).downloadUrl;
}
export const s3url_dl_infos = ({s3url_dl, s3url = undefined}) => async data => {
    let [bucket, key, name = undefined] = (s3url_dl || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    name = name ? replaceVars(name, data) : undefined;
    return require('@ohoareau/aws').s3.getFileDownloadUrl({bucket, key, name})
}
export const s3url_view = ({s3url_view, s3url = undefined}) => async data => {
    let [bucket, key, contentType = undefined] = (s3url_view || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    contentType = contentType ? replaceVars(contentType, data) : undefined;
    return (await require('@ohoareau/aws').s3.getFileViewUrl({bucket, key, contentType})).viewUrl;
}
export const s3url_view_infos = ({s3url_view, s3url = undefined}) => async data => {
    let [bucket, key, contentType = undefined] = (s3url_view || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    contentType = contentType ? replaceVars(contentType, data) : undefined;
    return require('@ohoareau/aws').s3.getFileViewUrl({bucket, key, contentType});
}
export const s3url = s3url_view;
export const s3url_infos = s3url_view_infos;
export const s3url_ul = ({s3url_ul, s3url = undefined}) => async data => {
    let [bucket, key, expires = undefined] = (s3url_ul || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    expires = replaceVars(`${expires}`, data);
    if ((expires === '') || (expires === '-1') || (expires === 'undefined') || (expires === 'false')) {
        expires = undefined
    } else {
        expires = parseInt(expires);
    }
    return (await require('@ohoareau/aws').s3.getFileUploadUrl({bucket, key, expires})).uploadUrl;
}
export const s3url_ul_infos = ({s3url_ul, s3url = undefined}) => async data => {
    let [bucket, key, expires = undefined] = (s3url_ul || s3url || '').split(':');
    bucket = replaceVars(bucket, data);
    key = replaceVars(key, data);
    expires = replaceVars(`${expires}`, data);
    if ((expires === '') || (expires === '-1') || (expires === 'undefined') || (expires === 'false')) {
        expires = undefined
    } else {
        expires = parseInt(expires);
    }
    return require('@ohoareau/aws').s3.getFileUploadUrl({bucket, key, expires});
}
export const pattern = ({pattern}) => data => replaceVars(pattern, data);
export const url = ({url}) => data => replaceVars(url, data);
export const operation = ({operation, dir}) => async (data, query) => {
    operation = replaceVars(operation, data);
    return require('./services/caller').default.execute(operation, [{...query, ...data}], `${dir}/services/crud`);
}
export const pattern_url = (config: any) => {
    const [rawPattern, extraUri = undefined]: [string, string?] = (config['pattern_url'] || '').split(':');
    let pattern = process.env[`${rawPattern.toUpperCase()}_UP`] || undefined
    if (pattern) {
        if ('ms://' == pattern.slice(0, 5)) {
            const [microservice, ...others] = pattern.slice(5).split(/\//g);
            pattern = `${(process.env['MS_PROTOCOL_URL'] || '').replace(/\{\{microservice\}\}/g, microservice)}${others.length ? '/' : ''}${others.join('/')}`;
        } else if ('msr://' == pattern.slice(0, 6)) {
            const [microservice, ...others] = pattern.slice(6).split(/\//g);
            pattern = `${(process.env['MSR_PROTOCOL_URL'] || '').replace(/\{\{microservice\}\}/g, microservice)}${others.length ? '/' : ''}${others.join('/')}`;
        } else if ('ws://' == pattern.slice(0, 5)) {
            const [webservice, ...others] = pattern.slice(5).split(/\//g);
            pattern = `${(process.env['WS_PROTOCOL_URL'] || '').replace(/\{\{webservice\}\}/g, webservice)}${others.length ? '/' : ''}${others.join('/')}`;
        } else if ('wsr://' == pattern.slice(0, 6)) {
            const [webservice, ...others] = pattern.slice(6).split(/\//g);
            pattern = `${(process.env['WSR_PROTOCOL_URL'] || '').replace(/\{\{webservice\}\}/g, webservice)}${others.length ? '/' : ''}${others.join('/')}`;
        }
    }
    return completeDoc => {
        if (!pattern) return undefined;
        return replaceVars(`${pattern}${extraUri || ''}`, completeDoc) || undefined;
    }
}
export const msr_url = (config: any) => {
    const [microservice, uri = '']: [string, string?] = (config['msr_url'] || '').split(':');
    const pattern = `${(process.env['MSR_PROTOCOL_URL'] || '').replace(/\{\{microservice\}\}/g, microservice)}${uri}`;
    return completeDoc => replaceVars(pattern, completeDoc) || undefined;
}
export const ms_url = (config: any) => {
    const [microservice, uri = '']: [string, string?] = (config['ms_url'] || '').split(':');
    const pattern = `${(process.env['MS_PROTOCOL_URL'] || '').replace(/\{\{microservice\}\}/g, microservice)}${uri}`;
    return completeDoc => replaceVars(pattern, completeDoc) || undefined;
}
export const ws_url = (config: any) => {
    const [webservice, uri = '']: [string, string?] = (config['ws_url'] || '').split(':');
    const pattern = `${(process.env['WS_PROTOCOL_URL'] || '').replace(/\{\{webservice\}\}/g, webservice)}${uri}`;
    return completeDoc => replaceVars(pattern, completeDoc) || undefined;
}
export const wsr_url = (config: any) => {
    const [webservice, uri = '']: [string, string?] = (config['wsr_url'] || '').split(':');
    const pattern = `${(process.env['WSR_PROTOCOL_URL'] || '').replace(/\{\{webservice\}\}/g, webservice)}${uri}`;
    return completeDoc => replaceVars(pattern, completeDoc) || undefined;
}
