import caller from './services/caller';

const pattern = /^\[\[[^\]]+]]$/;

const computeConfig = (c, d) => {
    if ('object' === typeof c) return Object.entries(c).reduce((acc, [k, v]) =>
        Object.assign(acc, {[k]: computeConfig(v, d)})
    , {});
    if (Array.isArray(c)) return c.map(v => computeConfig(v, d));
    if (('string' === typeof c) && pattern.test(c)) return ('[[value]]' === c) ? d : d[c.substr(2, c.length - 4)];
    return c;
};

export const isTransition = (attribute, from, to, data) => {
    const old = (data && data.oldData) ? data.oldData[attribute] : undefined;
    const current = (data && data.data) ? data.data[attribute] : undefined;
    if (old === current) return false;
    return (('*' === to) || (current === to)) && (('*' === from) || (old === from));
};

export const isEqualTo = (attribute, value, data, key = 'data') => data && data[key] && (value === data[key][attribute]);
export const isNotEqualTo = (attribute, value, data, key = 'data') => !data || !data[key] || (value !== data[key][attribute]);
export const isLessThan = (attribute, value, data, key = 'data') => data && data[key] && (value > data[key][attribute]);
export const isLessOrEqualThan = (attribute, value, data, key = 'data') => data && data[key] && (value >= data[key][attribute]);
export const isGreaterThan = (attribute, value, data, key = 'data') => data && data[key] && (value < data[key][attribute]);
export const isGreaterOrEqualThan = (attribute, value, data, key = 'data') => data && data[key] && (value <= data[key][attribute]);
export const isModulo = (attribute, value, data, key = 'data') => data && data[key] && (0 === (value % data[key][attribute]));
export const isDefined = (attribute, data, key = 'data') => data && data[key] && ((undefined !== data[key][attribute]) && (null !== data[key][attribute]));
export const isNotDefined = (attribute, data, key = 'data') => !data || !data[key] || (undefined === data[key][attribute]) || (null === data[key][attribute]);

export const findPlugin = (type, name, dir) => {
    let h;
    if ('@' === name.substr(0, 1)) {
        h = require(`./${type}s/${name.substr(1)}`).default;
    } else {
        h = require(`${dir}/${type}s/${name}`);
    }
    return h;
};
export const loadPlugin = (pluginType, cfg, {dir}) => {
    const t = typeof cfg;
    if ('function' === t) return cfg;
    if ('string' === t) cfg = {type: '@operation', config: {operation: cfg}};
    const {type, config = {}} = cfg || {};
    return findPlugin(pluginType, type, dir)({...config, dir});
};

export const createHelpers = (model, dir) => {
    const origDir = dir;
    dir = `${dir}/../..`;
    return on => {
        const operation = `${model.name}_${on}`;
        const hook = async (n, d, c = {}, opts = {}) => {
            if (opts['ensureKeys'] && Array.isArray(opts['ensureKeys'])) {
                opts['ensureKeys'].reduce((acc, k) => {
                    if ('function' !== typeof acc.hasOwnProperty) acc = {...acc};
                    acc[k] = acc.hasOwnProperty(k) ? acc[k] : '';
                    return acc;
                }, Array.isArray(d) ? d[0] : d);
            }
            if (opts['trackData'] && Array.isArray(opts['trackData']) && (0 < opts['trackData'].length)) {
                let data = Array.isArray(d) ? d[1] : d;
                if ('function' !== typeof data.hasOwnProperty) data = {...data};
                if (0 === opts['trackData'].filter(f => data.hasOwnProperty(f)).length) return Array.isArray(d) ? d[0] : d;
            }
            const h = findPlugin('hook', n, dir);
            const args = Array.isArray(d) ? d : [d];
            if (!!opts['loop']) return (await Promise.all(((args[0] || {})[opts['loop']] || []).map(async item => h({...computeConfig(c, item), o: operation, model, dir, hook})(...args)))).pop();
            return h({...c, o: operation, on, operationName: on, model, dir, hook})(...args);
        };
        const call = async (name, ...args) => caller.execute(name, args, origDir);
        const incrementStat = async (name, value, join, result, query) =>
            hook(`@increment-stat`, [result, query], {name, value, join})
        ;
        const decrementStat = async (name, value, join, result, query) =>
            hook(`@decrement-stat`, [result, query], {name, value, join})
        ;
        const updateStat = async (name, result, query, config = {}) =>
            hook(`@update-stat`, [result, query], {...config, name})
        ;
        const resetStat = async (name, join, result, query) =>
            hook(`@reset-stat`, [result, query], {name, join})
        ;
        const updateRefs = async (name, key, value) => {
            // @todo handle multiple page
            try {
                const page = await call(`${name}_find`, {criteria: {[key]: value}, fields: ['id']});
                await Promise.all(((page || {}).items || []).map(async i => call(`${name}_update`, {
                    id: i.id,
                    data: {[key]: value}
                })));
            } catch (e: any) {
                console.error('Update references FAILED', {name, key, value}, e);
            }
        };
        const lambdaEvent = async (arn, payload) =>
            require('./services/aws/lambda').default.execute(arn, payload, {async: true})
        ;
        const snsPublish = async (topic, message, attributes = {}) =>
            require('./services/aws/sns').default.publish({message, attributes, topic})
        ;
        const event = async (detailType: string, result: any, query: any) => hook('@eventbridge/send', [result, query], {detailType});
        const deleteRefs = async (name, key, value) => {
            // @todo handle multiple page
            try {
                const page = await call(`${name}_find`, {criteria: {[key]: value}, fields: ['id']});
                await Promise.all(((page || {}).items || []).map(async i => call(`${name}_delete`, {id: i.id})));
            } catch (e: any) {
                console.error('Delete references FAILED', {name, key, value}, e);
            }
        };
        const requires = async (query) => hook('@requires', query);
        const dynamics = async (result, query, mode = 'item') => hook('@dynamics', [result, query, mode]);
        const validate = async (query, required = true) => hook('@validate', query, {required});
        const authorize = async (query) => hook('@authorize', query);
        const prefetch = async query => hook('@prefetch', query);
        const transform = async query => hook('@transform', query);
        const pretransform = async query => hook('@pretransform', query);
        const mutate = async (query, type, config = {}) => hook('@mutate', query, {type, config});
        const autoTransitions = async (result, query) => hook('@auto-transitions', [result, query]);
        const populate = async (query, prefix = undefined) => hook('@populate', query, {prefix});
        const prepopulate = async (query, prefix = undefined) => hook('@prepopulate', query, {prefix});
        const prepare = async query => hook('@prepare', query);
        const after = async (result, query) => hook('@after', [result, query]);
        const convert = async (result, query) => hook('@convert', [result, query]);
        const dispatch = async (result, query) => hook('@dispatch', [result, query]);
        return {event, incrementStat, decrementStat, updateStat, resetStat, requires, dynamics, authorize, validate, prepopulate, populate, prefetch, dispatch, pretransform, convert, transform, mutate, prepare, after, autoTransitions, isTransition, isEqualTo, isNotEqualTo, isNotDefined, isDefined, isLessThan, isLessOrEqualThan, isGreaterThan, isGreaterOrEqualThan, isModulo, hook, updateRefs, deleteRefs, call, lambdaEvent, snsPublish};
    };
}

export function replaceVars(pattern, data = {}) {
    const envVarMatch = pattern.match(/^\[\[process.env.([^\]]+)]]$/);
    if (envVarMatch) {
        pattern = process.env[envVarMatch[1]] || '';
    }

    const r = new RegExp('\{\{([^\}]+)\}\}', 'g');
    const matches = [...pattern.matchAll(r)];
    const getValue = k => ('undefined' === typeof data[k]) ? '' : data[k];

    return matches.reduce((acc, m) => {
        for (let i = 0; i < (m.length - 1); i++) {
            acc = acc.replace(m[0], getValue(m[i + 1]));
        }
        return acc;
    }, pattern);
}
export function buildAllowedTransitions(transitions: any, value: string|undefined, valueIfUndefined: string) {
    let allowed: string[] = [];
    const current = value || valueIfUndefined;
    if (!transitions) {
        // no transitions defined, all are allowed
        return ['*'];
    }
    if (!transitions[current]) {
        // transitions defined, but none for the current step requested
        if (!!transitions['*']) {
            // a fallback is defined in transitions
            allowed = transitions['*'];
        } else {
            allowed = [];
        }
    } else {
        allowed = [...transitions[current], ...(transitions['*'] || [])];
    }

    allowed = Object.keys(allowed.reduce((acc, v) => Object.assign(acc, {[v]: true}), {}));
    allowed.sort();
    return allowed;
}