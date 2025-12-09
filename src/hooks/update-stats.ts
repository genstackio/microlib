import caller from "../services/caller";
import evaluate from "../utils/evaluate";
import extractVariablePropertyNamesInExpression from "../utils/extractVariablePropertyNamesInExpression";
import deduplicateAndSort from "../utils/deduplicateAndSort";
import {mHookError} from "../m";

// noinspection JSUnusedGlobalSymbols
export default ({on, model: {statTargets = {}}, dir}) => async (result: any, query: any, operation: string|undefined = undefined) => {
    const call = async (name: string, ...args: any[]) => caller.execute(name, args, `${dir}/services/crud`);
    const op = operation || on;
    const toTrigger = computeToTrigger(op, statTargets);

    if (!toTrigger || !Object.keys(toTrigger).length) return result;

    const report = await Promise.allSettled(Object.entries(toTrigger).map(async ([a, b]: [any, any]) => {
        return Promise.allSettled(Object.entries(b).map(async ([_, b2]: [any, any]) => {
            if (!Object.keys(b2).length) return;
            return applyTrigger(result, query, a, b2, call)
        }));
    }));
    await Promise.allSettled(report.filter((r: any) => 'fulfilled' !== r.status).map(processTriggerError))

    return result;
}

function computeToTrigger(operation: string, targets: any) {
    if (!targets || !targets[operation] || !Object.keys(targets[operation]).length) return undefined;

    return targets[operation];
}

function convertLegacyValue(value: string) {
    if ('$' === value.slice(0, 1)) return `new.${value.slice(1)}`;
    if ('%' === value.slice(0, 1)) return `old.${value.slice(1)}`;
    if ('@' === value.slice(0, 1)) return `data.${value.slice(1)}`;
    if ('#' === value.slice(0, 1)) return `user.${value.slice(1)}`;
    return value;
}

async function buildValue({value = undefined, type = 'float', round = undefined, min = undefined, max = undefined, ratio = undefined}: {value?: any, type?: string, round?: string|number, min?: number, max?: number, ratio?: number} = {}, result: any, query: any, defaultValue: any) {
    if (undefined === value) return [defaultValue, []];
    if ('string' !== typeof value) return [value, []];
    value = convertLegacyValue(value);

    const valueBuilder = async (item: any = {}) => {
        let r: any = await evaluate(value, {joined: item || {}, neo: {...(query?.oldData || {}), ...Object.entries(result || {}).reduce((acc, [k, v]) => {
                ((undefined !== v) && (null !== v)) && (acc[k] = v);
                return acc;
            }, {} as any)}, new: result || {}, old: query?.oldData || {}, data: query?.data || {}, user: query?.user || {}, query, result});

        switch (type) {
            case 'float': r = 'number' === typeof r ? r : parseFloat(r); break;
            case 'integer': r = 'number' === typeof r ? r : parseInt(r); break;
            case 'string': r = 'string' === typeof r ? r : String(r); break;
            default: break;
        }
        if (undefined !== ratio) {
            if (ratio < 0.00000001) {
                r = 0.0;
            } else {
                r = r / ratio;
            }
        }
        switch (round) {
            case 'ceil': r = Math.ceil(r); break;
            case 'floor': r = Math.floor(r); break;
            case undefined: break;
            default:
                if ('number' === typeof round) {
                    r = Math.round(r * Math.pow(10, round)) / Math.pow(10, round);
                } else {
                    throw new Error(`Unsupported value rounder '${round}'`);
                }
                break;
        }
        if (undefined !== min) {
            r = Math.min(r, min);
        }
        if (undefined !== max) {
            r = Math.max(r, max);
        }
        return r;
    }
    return (value.indexOf('joined.') >= 0) ? [valueBuilder, extractVariablePropertyNamesInExpression(value, 'joined')] : [await valueBuilder(), []];
}
async function buildUpdaterForField(o: [any, Function[], string[]], name: string, config: any, result: any, query: any) {
    const action = ((config || {}).action || {});
    const actionType = action.type;
    let v: any = undefined;
    let extraItemFields: string[] = [];
    switch (actionType) {
        case '@inc':
            [v, extraItemFields] = await buildValue(action.config, result, query, 1);
            if ('function' === typeof v) {
                o[1].push(async (item) => ({'$inc': {[name]: await v(item)}}));
            } else {
                o[0]['$inc'] = o[0]['$inc'] || {};
                o[0]['$inc'][name] = v;
            }
            extraItemFields && extraItemFields.length && (o[2] = [...o[2], ...extraItemFields]);
            break;
        case '@dec':
            [v, extraItemFields] = await buildValue(action.config, result, query, 1);
            if ('function' === typeof v) {
                o[1].push(async (item) => ({'$dec': {[name]: await v(item)}}));
            } else {
                o[0]['$dec'] = o[0]['$dec'] || {};
                o[0]['$dec'][name] = v;
            }
            extraItemFields && extraItemFields.length && (o[2] = [...o[2], ...extraItemFields]);
            break;
        case '@clear':
            o[0]['$reset'] = o[0]['$reset'] || [];
            o[0]['$reset'] = [...o[0]['$reset'], name];
            break;
        default:
            throw new Error(`Unsupported action type for field updater (stat): '${actionType}`);
    }
    return o;
}

// noinspection JSUnusedLocalSymbols
function isValidForFilter(filter: any, result: any, query: any, tracker: any) {
    const getFieldValue = xx => result[xx[0]] || ((query || {})['oldData'] || {})[xx[0]];
    return Object.entries(filter).reduce((acc: boolean, [k, v]: [string, any]) => {
        switch (k) {
            case '$eq': return acc && (getFieldValue(v) === v[1]);
            case '$ne': return acc && (getFieldValue(v) !== v[1]);
            case '$lt': return acc && (getFieldValue(v) < v[1]);
            case '$lte': return acc && (getFieldValue(v) <= v[1]);
            case '$gt': return acc && (getFieldValue(v) > v[1]);
            case '$gte': return acc && (getFieldValue(v) >= v[1]);
            case '$in': return acc && ((v[1] || []).includes(getFieldValue(v)));
            case '$nin': return acc && !((v[1] || []).includes(getFieldValue(v)));
            case '$empty': return acc && ((undefined === getFieldValue(v)) || (null === getFieldValue(v)) || ('' === getFieldValue(v)));
            case '$nonempty': return acc && ((undefined !== getFieldValue(v)) && (null !== getFieldValue(v)) && ('' !== getFieldValue(v)));
            default: return acc && (result[k] === v);
        }
    }, true as boolean);
}
async function computeUpdateDataForTrigger(result: any, query: any, tracker: any): Promise<[{[key: string]: any}|((any) => {[key: string]: any}), string[]]> {
    const [a, b, c] = await Object.entries(tracker).reduce(async (acc: any, [n, t]: [string, any]) => {
        try {
            if (t && t.filters && Array.isArray(t.filters) && (0 < t.filters.length)) {
                const found = t.filters.find(ff => isValidForFilter(ff, result, query, tracker));
                if (!found) return await acc; // update not added
            }
            // noinspection UnnecessaryLocalVariableJS
            const r = await buildUpdaterForField(await acc, n, t, result, query);
            return r;
        } catch (e: any) {
            await mHookError(e, 'update-stats', {data: {tracker, result, id: (query || {}).id, data: (query || {}).data}});
            throw e;
        }
    }, Promise.resolve([{}, [], []]));

    const d = deduplicateAndSort(c);

    if (!b || !b.length) return [a, d];

    return [async function (item: any = {}) {
        return b.reduce(async (acc, f) => {
            const localUpdateData = await acc;
            const resultUpdateData = await f(item);
            return mergeUpdateData(resultUpdateData, localUpdateData);
        }, Promise.resolve(a));
    }, d];
}

function mergeUpdateData(a, b: any) {
    return Object.entries(b).reduce((acc: any, [k, v]: [string, any]) => {
        if (!acc.hasOwnProperty(k)) {
            acc[k] = v;
        } else {
            if ('$' === k.slice(0, 1)) { // $inc / $dec / $reset / ...
                acc[k] = {...acc[k], ...(v || {})};
            } else { // others => field names, ex: propertyName1, propertyName2, ...
                acc[k] = v;
            }
        }
        return acc;
    }, {...a});
}

function computeUpdateCriteriaForTrigger(result: any, query: any, tracker: any) {
    // tracker is an objet with key are fieldNames, and values are {join: '...', idField: '...', ...} // idField optional
    // we take the first, because join/idField are always the same in this tracker

    const {join, idField} = Object.values(tracker)[0] || {} as any;

    const joinFieldName = join;
    const idFieldName = idField || 'id';
    const fieldValue = result[joinFieldName] || ((query || {})['oldData'] || {})[joinFieldName];

    if (!joinFieldName || (undefined === fieldValue)) return undefined;
    return {[idFieldName]: fieldValue};
}
async function applyTrigger(result: any, query: any, name: string, tracker: any, call: Function) {

    const updateCriteria = computeUpdateCriteriaForTrigger(result, query, tracker);
    const [updateData, extraItemFields = []] = await computeUpdateDataForTrigger(result, query, tracker);

    if (!updateCriteria) return; // unable to detect criteria to filter items
    if (!updateData || (('function' !== typeof updateData) && !Object.keys(updateData).length)) return; // nothing to update

    try {
        let offset: any = undefined;
        let page: any = undefined;
        let step = 0;
        const limit = 500;
        const maxSteps = 10000; // max limit * this value items.
        do {
            page = await call(`${name}_find`, {
                offset,
                limit,
                criteria: updateCriteria,
                fields: ['cursor', 'id', ...extraItemFields],
            });
            await Promise.allSettled(((page || {}).items || []).map(async item => {
                try {
                    // keep the await
                    return await call(`${name}_rawUpdate`, {
                        id: item.id,
                        data: ('function' === typeof updateData) ? await (updateData as any)(item) : updateData,
                    });
                } catch (e: any) {
                    await mHookError(e, 'update-stats', {data: {item, name, offset, limit, updateCriteria, maxSteps, page, step, result, tracker}})
                    throw e
                }
            }));
            offset = (page || {}).cursor;
            step++;
        } while(!!offset && (step < maxSteps));
        if (!!offset) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error(`There was more than ${maxSteps} iteration of ${limit} items to process, aborting`);
        }
    } catch (e: any) {
        await mHookError(e, 'update-stats', {data: {name, result, tracker}})
    }
}

async function processTriggerError(report: any) {
    await mHookError(new Error('Update stats trigger error'), 'update-stats', {data: {report}});
}
