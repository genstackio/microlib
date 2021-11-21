import createAcl from '../services/acl';

export default ({o, acls = {}}) => {
    const {check} = createAcl(acls);
    return async (req, res, next) => {
        await check(req, o);
        return next();
    };
}