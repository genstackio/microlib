import fetch from 'node-fetch';

// noinspection JSUnusedLocalSymbols
const request = async (url, method = 'get', body: any = undefined, headers = {}, options: any = {}) => {
    return fetch(
        url,
        {
            method,
            body: body ? (('string' === typeof body) ? body : JSON.stringify(body)) : undefined,
            headers,
        }
    );
}

const httpGet = async (url, headers = {}, options: any = {}) => {
    const res = await request(url, 'get', undefined, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

const httpPost = async (url, body = {}, headers = {}, options: any = {}) => {
    const res = await request(url, 'post', body, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

const httpDelete = async (url, headers = {}, options: any = {}) => {
    const res = await request(url, 'delete', undefined, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

const httpHead = async (url, headers = {}, options: any = {}) => {
    const res = await request(url, 'head', undefined, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

const httpPut = async (url, body = {}, headers = {}, options: any = {}) => {
    const res = await request(url, 'put', body, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

const httpOptions = async (url, headers = {}, options: any = {}) => {
    const res = await request(url, 'options', undefined, headers, options);
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return res.json();
}

export default {
    request,
    get: httpGet, post: httpPost, delete: httpDelete, head: httpHead, put: httpPut, options: httpOptions,
}

