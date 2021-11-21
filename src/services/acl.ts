import UnauthorizedError from "../errors/UnauthorizedError";

export default ({userRoleKey = 'role', permissions = {}}: {userRoleKey?: string, permissions?: any}) => {
    const getPermissions = async () => permissions;
    const getRolePermissions = async (role: string) => permissions[role] || {};
    const isOperationAllowedForRole = async (role: string, operation: string) => {
        const p = await getRolePermissions(role);
        return !!p['*'] || !!p[operation];
    };
    const test = isOperationAllowedForRole;
    const check = async (query: any, operation: string) => {
        const role = (query && query.user && query.user[userRoleKey]) || undefined;
        if (!!query && !!query.private && (!role || !await test(role, operation))) throw new UnauthorizedError();
    };
    return {
        getPermissions,
        getRolePermissions,
        isOperationAllowedForRole,
        test,
        check,
    };
}