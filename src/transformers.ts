import {replaceVars} from "./utils";
import saver from "./services/saver";

export const slug = ({sep = '-'}: any = {}) => v => {
    v = v || '';
    v = v.toLowerCase();
    v = v.replace(/[éèêëęėē]+/g, 'e');
    v = v.replace(/[àâªáäãåā]+/g, 'a');
    v = v.replace(/[ÿ]+/g, 'y');
    v = v.replace(/[ûùüúū]+/g, 'u');
    v = v.replace(/[îïìíįī]+/g, 'i');
    v = v.replace(/[ôºöòóõøō]+/g, 'o');
    v = v.replace(/[çćč]+/g, 'c');
    v = v.replace(/[ñń]+/g, 'n');
    v = v.replace(/[œ]+/g, 'oe');
    v = v.replace(/[æ]+/g, 'ae');
    v = v.replace(/[$]+/g, ' dollar');
    v = v.replace(/[€]+/g, ' euro');
    v = v.replace(/[@]+/g, ' at');
    v = v.replace(/[&]+/g, ' and');
    v = v.replace(/[§]+/g, ' s ');
    v = v.replace(/[%]+/g, ' percent ');

    v = v.replace(/[^a-z0-9-]+/g, ' ').replace(/[\s]+/g, ' ')
    v = v.trim();
    v = v.replace(/[\s]+/g, sep);

    return !!v ? v : undefined;
};
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