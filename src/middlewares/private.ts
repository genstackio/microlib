import UnauthorizedError from '../errors/UnauthorizedError';

export default () => async (req, res, next) => {
    if (!req.private || req.user) return next();
    throw new UnauthorizedError();
}