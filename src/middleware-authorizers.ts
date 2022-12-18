export const status = ({authorized, status, reason = undefined}: any) => async () => ({authorized, status, reason});
export const allowed = config => status({...config, authorized: true, status: 'allowed'});
export const unknown = config => status({...config, authorized: false, status: 'unknown'});
export const user = () => async ({req}) => {
    if (!req.user || (!req.user.id)) return {status: 'forbidden', reason: 'authorization required'};
    return ({authorized: true, status: 'allowed'});
};
export const anonymous = ()  => async ({req}) => {
    if (!!req.user && (!!req.user.id)) return {status: 'forbidden', reason: 'anonymous user allowed only'};
    return ({authorized: true, status: 'allowed'});
};
export const service = ({name, method}, {dir})  => async ({req}) => {
    try {
        const result = await require(`${dir}/services/${name}`)[method](req);
        return {status: 'allowed', authorized: true, ...(result || {})};
    } catch (e: any) {
        return {authorized: false, status: 'error', reason: e.message};
    }
};
export const acl = ({acls})  => async ({req}) => {
    try {
        const s = await require('./services/acl').default(acls);
        if (!(await s.test(req))) {
            return {authorized: false, status: 'error', reason: 'not allowed'};
        }
        return {status: 'allowed', authorized: true};
    } catch (e: any) {
        return {authorized: false, status: 'error', reason: e.message};
    }
};
export const lambda = ({arn, ttl = -1}) => {
    const lambda = require('../services/aws/lambda').default;
    return async ({req}: any) => {
        let result;
        try {
            result = await lambda.execute(arn, {params: {...req.authorization, ttl}});
        } catch (e: any) {
            return {status: 'error', error: e, authorized: false};
        }
        if (!result || !result.status) return {status: 'no-status', authorized: false};
        switch (result.status) {
            case 'allowed': return {...(result.metadata || {}), status: 'allowed', authorized: true};
            case 'forbidden': return {status: 'forbidden' || undefined, ...(result.metadata || {}), authorized: false};
            default: return {status: 'unknown', reason: result.status, ...(result.metadata || {}), authorized: false};
        }
    };
};

const testUserRole = (user, role, message = undefined) => {
    if (!role || !Array.isArray(role) || (!role.length)) return;
    if (!user || !user.permissions || !Array.isArray(user.permissions) || !role.find(p => user.permissions.includes(p))) {
        return {status: 'forbidden', authorized: false, reason: message || 'missing role'};
    }
    return {status: 'allowed', authorized: true};
}
export const denied = () => async () => status({status: 'forbidden', authorized: false, reason: 'denied'});
export const admin = () => async (v, {user}) => testUserRole(user, ['admin']);
export const roles = ({roles = []}) => async (v, {user}) => testUserRole(user, roles);
