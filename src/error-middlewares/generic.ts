export default ({mapping = {}}) => async (e, req, res) => {
    process.env.MICROSERVICE_DEBUG && console.error(e);
    res.statusCode = ('number' === typeof e.code) ? e.code : 500;
    res.body = e.serialize ? e.serialize(): {
        errorType: 'error',
        data: {},
        errorInfo: {},
        message: e.message || 'Unexpected error',
    };
    const c = mapping[`${res.statusCode}`];
    c && Object.assign(res, {statusCode: c.code, body: c.body || {errorType: 'error', data: {}, errorInfo: {}, message: c.message || 'Error'}});
}