import {replaceVars} from "./utils";

export const upper = () => v => `${v}`.toUpperCase();
export const lower = () => v => `${v}`.toLowerCase();
export const jsonStringify = () => v => JSON.stringify(v);

export const payload2s3 = ({ bucket, key, contentType = 'application/json', replaceBy = 'id' }) => async (v, query) => {
    const data = { ...(query.oldData || {}), ...(query.data || {}) };
    const vars = {...query, ...data};
    await require('@ohoareau/aws').s3.setFileContent(
        {
            bucket: replaceVars(bucket, vars),
            key: replaceVars(key, vars),
            contentType,
        },
        await serializeContentFromContentType(v, contentType)
    );
    return data?.[replaceBy || ''] || undefined;
}

const types = {
    ['application/json']: (content: unknown) => 'string' === typeof content ? content : JSON.stringify(content),
}

async function serializeContentFromContentType(content: unknown, contentType: string) {
    const serializer = types[contentType || ''];
    if (!serializer) throw new Error(`Unsupported content type '${contentType}' for serialization, supported types: ${Object.keys(types).join(', ')}`);
    return serializer(content);
}