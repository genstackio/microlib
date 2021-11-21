import {decode as decodeQueryString} from 'querystring';
import d from 'debug';

const debugApigatewayMiddleware = d('micro:middleware:apigateway');

const injectData = req => {
    req.params = req.params || {};
    const z = req.params;
    const u = req.isBase64Encoded ? new Buffer(req.body, 'base64').toString('utf-8') : req.body;
    // noinspection JSUnusedAssignment
    let x: any = undefined;
    if (req && req.headers && ((req.headers['content-type'] || '').toLowerCase() === 'application/x-www-form-urlencoded')) {
        x = decodeQueryString(u);
    } else {
        x = JSON.parse(u || '{}');
    }
    if (x) {
        z.data = z.data || {};
        if (x.data) {
            if (1 >= (Object.keys(x).length)) {
                Object.assign(z.data, x.data);
            } else {
                Object.assign(z.data, x);
            }
        } else Object.assign(z.data, x)
    }
    if (req.options && req.options.params) {
        Object.assign(req, req.params || {});
    }
}
export const populateFromV1 = (req, res) => {
    req.method = req.httpMethod;
    req.path = req.resource;
    req.params = {
        ...(req.params || {}),
        ...(req.queryStringParameters || {}),
        ...(req.pathParameters || {}),
    };
    injectData(req);
    res.type('application/json; charset=UTF-8');
    res.bodyOnly = false;
};

export const populateFromV2 = (req, res) => {
    req.method = req.requestContext.http.method;
    req.path = req.requestContext.http.path;
    req.params = {
        ...(req.params || {}),
        ...(req.queryStringParameters || {}),
        ...(req.pathParameters || {}),
    };
    injectData(req);
    res.type('application/json; charset=UTF-8');
    res.bodyOnly = false;
};

export const detectVersion: (any) => 'v1' | 'v2' = (req: any) =>
    (req.requestContext && req.requestContext.http) ? 'v2' : 'v1'
;

export default () => async (req, res, next) => {
    const v = detectVersion(req);
    debugApigatewayMiddleware('version %s', v);
    switch (v) {
        case 'v2': populateFromV2(req, res); break;
        default:
        case 'v1': populateFromV1(req, res); break;
    }
    return next();
}