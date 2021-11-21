import d from 'debug';

const debugMiddlewareJwt = d('micro:middleware:jwt');

export default () => async (req, res, next) => {
    req.headers && req.headers.Authorization && (req.user = require('jsonwebtoken').verify(
        req.headers.Authorization.split(' ')[1],
        String(process.env.JWT_SECRET || 'the-very-secret-secret')
    ));
    debugMiddlewareJwt('user %j', req.user);
    return next();
}