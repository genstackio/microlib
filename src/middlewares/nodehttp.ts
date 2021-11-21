import url from 'url';

export default () => async (req, res, next) => {
    req.path = req.url;
    req.params = url.parse(req.url, true).query;
    req.params = {
        ...(req.params || {}),
        ...(req.queryStringParameters || {}),
        ...(req.pathParameters || {}),
    };
    Object.assign(req, JSON.parse(req.body || '{}'));
    res.type('application/json');
    res.bodyOnly = false;
    const response = await next();
    res.statusCode = response.statusCode;
    res.headers = {...res.headers, ...response.headers};
    res.body = response.body;
    return res;
}