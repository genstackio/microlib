import d from 'debug';

const debugServiceCallerExecuteLocal = d('micro:service:caller:execute:local');
const debugServiceCallerExecuteRemote = d('micro:service:caller:execute:remote');

const inferArnIfPossible = dsn => {
    const upperCasedName = `${dsn.toUpperCase().replace(/[^A-Z0-9_]+/g, '_')}`;
    const sluggedName = dsn.replace(/\./g, '-');
    const tries = [
        `MICROSERVICE_${upperCasedName}_LAMBDA_ARN`,
        'MICROSERVICE_PATTERN_LAMBDA_OPERATION_ARN',
    ];
    const arn = tries.map(t => process.env[t]).filter(v => !!v).find(v => !!v);
    return !!arn ? arn.replace('{name}', sluggedName) : undefined;
};

const executeLocal = async (operation, params, dir: string|undefined = undefined) => {
    debugServiceCallerExecuteLocal('call %j', {operation, params, dir})
    const tokens = operation.split(/_/g);
    const op = tokens.pop();
    let r: any;
    if (dir) {
        r = await require(`${dir}/${tokens.join('_')}`)[op](...(Array.isArray(params) ? params : [params]));
    } else {
        r = await require(`@ohoareau/microlib/lib/services/${tokens.join('_')}`).default[op](...(Array.isArray(params) ? params : [params]));
    }
    debugServiceCallerExecuteLocal('result %j', r)
    return r;
};

const executeRemoteLambda = async (arn, params, options = {}) => {
    debugServiceCallerExecuteRemote('call %j', {arn, params, options})
    const r = await require('./aws/lambda').default.execute(arn, {params}, options);
    debugServiceCallerExecuteRemote('result %j', r)
    return r;
};

const executeRemote = async (dsn, params, options = {}) => {
    const arn = inferArnIfPossible(dsn);
    if (!arn) throw new Error(`Unknown remote operation '${dsn}'`);
    return executeRemoteLambda(arn, params, options);
};

const execute = async (dsn, params, dir: string|undefined = undefined, options = {}) => {
    const arn = inferArnIfPossible(dsn);
    if (!!arn) return executeRemoteLambda(arn, params, options);
    return executeLocal(dsn, params, dir);
};

export default {execute, executeLocal, executeRemote, executeRemoteLambda}

