export default ({o}) => async (req, res, next) => {
    if (!process.env.MICROSERVICE_DEBUG) return next();
    try {
        console.log('MICROSERVICE EXECUTION DEBUG - START', o, {req, res});
        const r = await next();
        console.log('MICROSERVICE EXECUTION DEBUG - END', o, {req, res});
        return r;
    } catch (e: any) {
        console.log('MICROSERVICE EXECUTION DEBUG - ERROR', e);
        throw e;
    }
}