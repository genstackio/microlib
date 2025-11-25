const s = (authorized: boolean, status: string, reason: string|undefined = undefined) => ({authorized, status, reason});

// noinspection JSUnusedGlobalSymbols
export const status = ({authorized, status, reason = undefined}: any) => async () => s(authorized, status, reason);
export const allowed = (config: any) => async () => s(true, 'allowed', config?.reason);
export const unknown = (config: any) => async () => s(false, 'unknown', config?.reason);
// noinspection JSUnusedGlobalSymbols
export const user = () => async ({req}) => {
    if (!req.user || (!req.user.id)) return s(false, 'forbidden', 'authorization required');
    return s(true, 'allowed');
};
// noinspection JSUnusedGlobalSymbols
export const anonymous = ()  => async ({req}) => {
    if (!!req.user && (!!req.user.id)) return s(false, 'forbidden', 'anonymous user allowed only');
    return s(true, 'allowed');
};
// noinspection JSUnusedGlobalSymbols
export const service = ({name, method}, {dir})  => async ({req}) => {
    try {
        const result = await require(`${dir}/services/${name}`)[method](req);
        return s('undefined' !== typeof result?.authorized ? result.authorized : true, 'undefined' !== typeof result?.status ? result.status : 'allowed', result?.reason);
    } catch (e: any) {
        return s(false, 'error', e.message);
    }
};
export const acl = ({acls})  => async ({req}) => {
    try {
        const s = require('./services/acl').default(acls);
        if (!(await s.test(req))) {
            return s(false, 'error', 'not allowed');
        }
        return s(true, 'allowed');
    } catch (e: any) {
        return s(false, 'error', e.message);
    }
};
// noinspection JSUnusedGlobalSymbols
export const lambda = ({arn, ttl = -1}) => {
    const lambda = require('../services/aws/lambda').default;
    return async ({req}: any) => {
        let result: any;
        try {
            result = await lambda.execute(arn, {params: {...req.authorization, ttl}});
        } catch (e: any) {
            return s(false, 'error', e.message);
        }
        if (!result || !result.status) return s(false, 'no-status');
        switch (result.status) {
            case 'allowed': return s(true, 'allowed', result.metadata?.reason);
            case 'forbidden': return s(false, result?.metadata?.status || 'forbidden', result.metadata?.reason);
          default: return s(false, result?.status || 'unknown', result?.reason || result?.status);
        }
    };
};

const testUserRole = (user: any, role: any, message = undefined) => {
    if (!role || !Array.isArray(role) || (!role.length)) return;
    if (!user || !user.permissions || !Array.isArray(user.permissions) || !role.find(p => user.permissions.includes(p))) {
        return s(false, 'forbidden', message || 'missing role');
    }
    return s(true, 'allowed');
}
export const denied = () => async () => s(false, 'forbidden', 'denied');
export const admin = () => async (_: any, {user}) => testUserRole(user, ['admin']);
// noinspection JSUnusedGlobalSymbols
export const roles = ({roles = []}) => async (_: any, {user}) => testUserRole(user, roles);
