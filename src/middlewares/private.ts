import UnauthorizedError from '@ohoareau/errors/lib/UnauthorizedError';

export default () => async (req, res, next) => {
    if (!req.private || req.user) return next();
    throw new UnauthorizedError();
}