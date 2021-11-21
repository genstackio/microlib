import d from 'debug';

const debugAuthorizerMiddleware = d('micro:middleware:authorizer');


const createAuthorizer = ({type, dir, ...config }) => {
    let a;
    if ('@' === type.substr(0, 1)) {
        a = require('../middleware-authorizers');
        type = type.substr(1);
    } else {
        a = require(`${dir}/middleware-authorizers`);
    }
    return (a[type.replace(/-/g, '_')] || a.unknown)(config, {dir, type});
};

function buildAuthorizerConfig({authorization = undefined, z}) {
    let config: any = authorization || '@allowed';
    if ('string' === typeof config) config = {type: config};
    return {...config, dir: z};
}
export default (cfg) => {
    const {o} = cfg;
    const builtConfig = buildAuthorizerConfig(cfg);
    const authorizer = createAuthorizer(builtConfig);
    return async (req, res, next) => {
        debugAuthorizerMiddleware('config %j', builtConfig);
        req.authorization = {
            authorized: false,
            user: req.user,
            operation: o,
        };
        const result = await authorizer({req, res});
        debugAuthorizerMiddleware('result %j', result);
        if (!result || !result.authorized || 'allowed' !== result.status) {
            switch ((result || {}).status) {
                case 'forbidden':
                    throw new Error(`Operation is forbidden by authorizer for user (reason: ${result.reason || 'not specified'})`);
                case 'error':
                    throw new Error(`Unable to get authorization information from authorizer (error: ${(result.error || {}).message || 'none'})`);
                case 'unknown':
                    throw new Error(`Operation is neither allowed nor forbidden by authorizer for user, it is then considered as forbidden by policy (reason: ${result.reason || 'not specified'})`);
                case 'no-status':
                    throw new Error(`Unable to get authorization information from authorizer (error: no status)`);
                default:
                    throw new Error(`Unknown authorization`);
            }
        }
        Object.assign(req.authorization, result);
        debugAuthorizerMiddleware('authorization %j', req.authorization);
        return next();
    };
}
