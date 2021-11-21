const buildJobResult = (status, result, executed, ctx) => {
    const now = new Date().valueOf();
    return {
        status, result, executed, dsn: ctx.dsn,
        startTime: ctx.startTime, endTime: now, duration: now - ctx.startTime,
    };
};

const isCallable = x => !!x && ('function' === typeof x);

const execute = async (dsn, payload, options = {}) => {
    const ctx = {...options, dsn, payload, startTime: new Date().valueOf()};
    const {
        onBeforeExecute, onException, onAfterExecute, getStatus,
        defaultStatus = 'completed',
    } = <any>options;
    try {
        isCallable(onBeforeExecute) && (await onBeforeExecute(ctx));
    } catch (e: any) {
        isCallable(onException) && (await onException(e, ctx));
        return buildJobResult('exception', e.message, false, ctx);
    }
    let result;
    try {
        switch (true) { // @todo add ability to call external apis instead of lambdas
            default:
                result = await require('./aws/lambda').default.execute(dsn, payload);
                break;
        }
    } catch (e: any) {
        isCallable(onException) && (await onException(e, ctx));
        return buildJobResult('exception', e.message, true, ctx);
    }
    try {
        isCallable(onAfterExecute) && (await onAfterExecute(result, ctx));
    } catch (e: any) {
        isCallable(onException) && (await onException(e, ctx));
        return buildJobResult('exception', e.message, true, ctx);
    }
    let status;
    try {
        status = (isCallable(getStatus) && getStatus(result)) || (result && result.status) || defaultStatus;
    } catch (e: any) {
        isCallable(onException) && (await onException(e, ctx));
        return buildJobResult('exception', e.message, true, ctx);
    }
    return buildJobResult(status, result, true, ctx);
};

export default {execute}