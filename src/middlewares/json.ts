export default () => async (req, res, next) => {
    req.body = JSON.parse(req.body);
    res.type('application/json');
    return next();
}