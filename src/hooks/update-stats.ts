import caller from "../services/caller";
import evaluate from "../utils/evaluate";
import d from 'debug';

const debugHookUpdateStats = d('micro:hooks:update-stats');

// noinspection JSUnusedGlobalSymbols
export default ({on, model: {statTargets = {}}, dir}) => async (result, query, operation: string|undefined = undefined) => {
    const call = async (name, ...args) => caller.execute(name, args, `${dir}/services/crud`);
    const op = operation || on;
    const toTrigger = computeToTrigger(op, statTargets);

    if (!toTrigger || !Object.keys(toTrigger).length) return result;

    debugHookUpdateStats('%s => to trigger %j', op, toTrigger);

    const report = await Promise.allSettled(Object.entries(toTrigger).map(async ([a, b]: [any, any]) => {
        return Promise.allSettled(Object.entries(b).map(async ([_, b2]: [any, any]) => {
            if (!Object.keys(b2).length) return;
            return applyTrigger(result, query, a, b2, call)
        }));
    }));
    await Promise.allSettled(report.filter((r: any) => 'fulfilled' !== r.status).map(processTriggerError))

    debugHookUpdateStats('%s => report %j', op, toTrigger);

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
    if (undefined === value) return defaultValue;
    if ('string' !== typeof value) return value;
    value = convertLegacyValue(value);
    let r: any = await evaluate(value, {new: result || {}, old: query?.oldData || {}, data: query?.data || {}, user: query?.user || {}, query, result});

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
                r = Math.round(round);
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
async function buildUpdaterForField(o: any, name: string, config: any, result: any, query: any) {
    const action = ((config || {}).action || {});
    const actionType = action.type;
    switch (actionType) {
        case '@inc':
            o['$inc'] = o['$inc'] || {};
            o['$inc'][name] = await buildValue(action.config, result, query, 1);
            break;
        case '@dec':
            o['$dec'] = o['$dec'] || {};
            o['$dec'][name] = await buildValue(action.config, result, query, 1);
            break;
        case '@clear':
            o['$reset'] = o['$reset'] || [];
            o['$reset'] = [...o['$reset'], name];
            break;
        default:
            throw new Error(`Unsupported action type for field updater (stat): '${actionType}`);
    }
    return o;
}

async function computeUpdateDataForTrigger(result: any, query: any, tracker: any) {
    return Object.entries(tracker).reduce(async (acc: any, [n, t]: [string, any]) => {
        try {
            // noinspection UnnecessaryLocalVariableJS
            const r = await buildUpdaterForField(await acc, n, t, result, query);
            return r;
        } catch (e: any) {
            console.error(e);
            throw e;
        }
    }, Promise.resolve({}));
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
    const updateData = await computeUpdateDataForTrigger(result, query, tracker);

    if (!updateCriteria) return; // unable to detect criteria to filter items
    if (!updateData || !Object.keys(updateData).length) return; // nothing to update

    debugHookUpdateStats('apply %j %j', updateCriteria, updateData);

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
                fields: ['cursor', 'id'],
            });
            await Promise.allSettled(((page || {}).items || []).map(async item => {
                try {
                    // noinspection UnnecessaryLocalVariableJS
                    const rr = await call(`${name}_rawUpdate`, {
                        id: item.id,
                        data: updateData,
                    });
                    // @todo log?
                    return rr;
                } catch (e: any) {
                    // @todo log?
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
        console.error('Update stats FAILED', {name, tracker}, e);
    }
}

async function processTriggerError(report: any) {
    console.error('Update stats trigger ERROR', JSON.stringify(report, null, 4));
}