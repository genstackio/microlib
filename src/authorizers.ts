const createDeniedError = (message = undefined) =>
    new Error(message || `You do not have sufficient permission to set this value`)
;
const checkUserRole = (user, role, message = undefined) => {
    if (!role || !Array.isArray(role) || (!role.length)) return;
    if (!user || !user.permissions || !Array.isArray(user.permissions) || !role.find(p => user.permissions.includes(p))) {
        throw createDeniedError(message);
    }
    return;
}

export const permissions = (def) => async (v, {user}) => {
    return checkUserRole(user, (def && def.permissions && def.permissions[v]) ? def.permissions[v] : undefined);
}
export const denied = () => async () => {
    throw createDeniedError();
}
export const allowed = () => async () => {
}
export const admin = () => async (v, {user}) => {
    checkUserRole(user, ['admin'])
}
export const roles = ({roles = []}) => async (v, {user}) => {
    checkUserRole(user, roles)
}
