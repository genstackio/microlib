import {replaceVars, slugify} from "./utils";
import saver from "./services/saver";

export const slug = ({sep = '-'}: any = {}) => v => slugify(v, sep);
export const truncate = ({length}) => v => (undefined !== length) ? v.slice(0, length) : v;
export const prefix = ({prefix}) => v => `${prefix || ''}${v}`;
export const suffix = ({suffix}) => v => `${v}${suffix || ''}`;
export const upper = () => v => `${v}`.toUpperCase();
export const lower = () => v => `${v}`.toLowerCase();
export const json2string = () => v => JSON.stringify(v);
export const password = ({rounds}) => v => require('bcryptjs').hashSync(v, rounds);
export const s3file = ({bucket, key, name, contentType}) => async (v, query) => {
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {})};
    bucket = replaceVars(bucket, vars)
    key = replaceVars(key, vars);
    name = name ? replaceVars(name, vars) : undefined;
    contentType = contentType ? replaceVars(contentType, vars) : undefined;
    await require('@ohoareau/aws').s3.setFileContent({bucket, key}, v);
    return {bucket, key, name, contentType};
}
export const file = ({bucket, key, name, contentType, algorithm = 'sha256'}) => async (v, query) => {
    const vars = {...query, ...(query.oldData || {}), ...(query.data || {})};
    if (v && v.content && ('**clear**' === v.content)) return '**clear**'; // empty the field
    return saver.saveFrom(v, {
        bucket: replaceVars(bucket, vars),
        key: replaceVars(key, vars),
        name: (v && v['contentType']) ? v['name'] : (name ? replaceVars(name, vars) : undefined),
        contentType: (v && v['contentType']) ? v['contentType'] : (contentType ? replaceVars(contentType, vars) : undefined),
        algorithm,
    });
}
export const image = file;
export const css = file;
export const js = file;
export const jsonFile = file;

export const list = () => v => {
    // for now, only array of STRINGs
    let x: any[] = [];
    if (undefined !== v) {
        if (!Array.isArray(v)) {
            if ('string' === typeof v) x = v.split(',');
            else x = [v];
        }
    }
    return x.length ? x.map(xx => `${xx}`) : undefined;
}
export const secret = ({path}, {dir}) => async (v, query, fieldName) => {
    if ('%' === (path || '').slice(0, 1)) {
        const fn = require(`${dir}/helpers`)[path.slice(1)];
        path = await fn(query.data, fieldName);
    }

    path = replaceVars(path, {fieldName})

    return `ssm://secrets/${await storeSsmParam(path, v)}`;
}
export const param = ({path}, {dir}) => async (v, query, fieldName) => {
    if ('%' === (path || '').slice(0, 1)) {
        const fn = require(`${dir}/helpers`)[path.slice(1)];
        path = await fn(query.data, fieldName);
    }
    path = replaceVars(path, {fieldName})

    return `ssm://params/${await storeSsmParam(path, v)}`;
}

async function storeSsmParam(path: string, value: any) {
    const AWS = require('aws-sdk');
    const ssm = new AWS.SSM();
    await ssm.putParameter({
        Name: path,
        Value: value,
        Overwrite: true,
        Type: 'String',
    }).promise();

    return '/' === path.slice(0, 1) ? path : `/${path}`;
}
