export default () => async (req, res, next) => {
    if (!req.warm) return next();
    res.json({status: 'success', code: 1000, message: 'warmed'});
}