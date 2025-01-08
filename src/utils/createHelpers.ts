import caller from "../services/caller";
import findPlugin from "./findPlugin";
import computeConfig from "./computeConfig";
import isModulo from "./isModulo";
import isEqualTo from "./isEqualTo";
import isDefined from "./isDefined";
import isLessThan from "./isLessThan";
import isTransition from "./isTransition";
import hasValueChanged from "./hasValueChanged";
import isValueCleared from "./isValueCleared";
import isValueUnemptied from "./isValueUnemptied";
import isNotEqualTo from "./isNotEqualTo";
import isNotDefined from "./isNotDefined";
import isGreaterThan from "./isGreaterThan";
import isLessOrEqualThan from "./isLessOrEqualThan";
import isGreaterOrEqualThan from "./isGreaterOrEqualThan";

export function createHelpers(model, dir) {
    const origDir = dir;
    dir = `${dir}/../..`;

    return function (on: string) {
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
        const updateReferences = async (result, query) => hook('@update-references', [result, query]);
        const deleteReferences = async (result, query) => hook('@delete-references', [result, query]);
        const updateStats = async (result, query, operation: string|undefined = undefined) => hook('@update-stats', [result, query, operation]);
        const lambdaEvent = async (arn, payload) => {
            return require('./services/aws/lambda').default.execute(arn, payload, {async: true})
        };
        const snsPublish = async (topic, message, attributes = {}) => {
            return require('./services/aws/sns').default.publish({message, attributes, topic})
        };
        const message = async (topic: string, message: any, ...rest: any[]) => {
            const originalNb = rest.length;
            /* const query = */ rest.pop(); // query
            /* const result = */ rest.pop(); // result
            let attributes: any = undefined;
            let group: string | undefined;
            let deduplication: string | undefined;
            let subject: string | undefined;
            switch (rest.length) {
                case 0:
                    break;
                case 1:
                    attributes = rest.pop();
                    break;
                case 2:
                    group = rest.pop();
                    attributes = rest.pop();
                    break;
                case 3:
                    deduplication = rest.pop();
                    group = rest.pop();
                    attributes = rest.pop();
                    break;
                case 4:
                    deduplication = rest.pop();
                    group = rest.pop();
                    attributes = rest.pop();
                    subject = rest.pop();
                    break;
                default:
                    throw new Error(`Unsupported number of arguments for message helper (nb: ${originalNb})`);
            }
            return require('./services/aws/sns').default.publish({
                message,
                ...(attributes ? { attributes } : {}),
                ...(group ? { group } : {}),
                ...(deduplication ? { deduplication } : {}),
                ...(subject ? { subject } : {}),
                topic,
            })
        };
        const eventbridgeSend = async (detailType: string, result: any, query: any) => {
            return hook('@eventbridge/send', [result, query], {detailType});
        }
        const event = async (detailType: string, result: any, query: any) => {
            if ((detailType !== operation) && (detailType.slice(0, model.name.length + 1) === `${model.name}_`)) {
                await updateStats(result, query, detailType.slice(model.name.length + 1));
            }
            await eventbridgeSend(detailType, result, query);
        }
        const requires = async (query, mode = 'item') => hook('@requires', [query, mode]);
        const dynamics = async (result, query, mode = 'item') => hook('@dynamics', [result, query, mode]);
        const validate = async (query, create = true) => hook('@validate', query, {create});
        const authorize = async (query) => hook('@authorize', query);
        const prefetch = async (query, mode?: string) => hook('@prefetch', [query, mode]);
        const transform = async query => hook('@transform', query);
        const pretransform = async query => hook('@pretransform', query);
        const mutate = async (query, type, config = {}) => hook('@mutate', query, {type, config});
        const autoTransitions = async (result, query) => hook('@auto-transitions', [result, query]);
        const populate = async (query, prefix = undefined) => hook('@populate', query, {prefix});
        const prepopulate = async (query, prefix = undefined) => hook('@prepopulate', query, {prefix});
        const prepare = async query => hook('@prepare', query);
        const after = async (result, query) => hook('@after', [result, query]);
        const refresh = async query => hook('@refresh', query);
        const rule = async (name, a: any, b?: any, c?: any) => hook('@business-rule', [a, b, c], {rule: name});
        const preEnhance = async query => hook('@pre-enhance', [query]);
        const postEnhance = async (result, query) => hook('@post-enhance', [result, query]);
        const convert = async (result, query, mode = 'item') => hook('@convert', [result, query, mode]);
        const dispatch = async (result, query) => hook('@dispatch', [result, query]);

        return {
            requires, dynamics, authorize, validate, prepopulate, populate, prefetch, dispatch, pretransform,
            convert, transform, mutate, prepare, after, autoTransitions, isTransition, isEqualTo, isNotEqualTo,
            isNotDefined, isDefined, isLessThan, isLessOrEqualThan, isGreaterThan, isGreaterOrEqualThan, isModulo,
            isValueCleared, hasValueChanged, isValueUnemptied,
            event, hook, call, lambdaEvent, snsPublish, updateReferences, deleteReferences, updateStats, rule,
            postEnhance, preEnhance, refresh, message,
        };
    };
}

export default createHelpers;
