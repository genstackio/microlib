import cors from 'cors';

export default (...args) => {
    const c = cors(...args);
    // we need to wrap cors express handler to be compatible with async next().
    return async (req, res, next) => {
        let ctx = {p: Promise.resolve()};
        await c(req, res, () => ctx.p = next());
        return ctx.p;
    };
}