import caller from "../services/caller";
import d from 'debug';

const debugHookDeleteReferences = d('micro:hooks:delete-references');

// noinspection JSUnusedGlobalSymbols
export default ({model: {referenceTargets = {}}, dir}) => async (result, query) => {
    const call = async (name, ...args) => caller.execute(name, args, `${dir}/services/crud`);
    const toTrigger = computeToTrigger(referenceTargets);

    if (!toTrigger || !toTrigger.trackers || !Object.keys(toTrigger.trackers).length) return result;

    debugHookDeleteReferences('to trigger %j', toTrigger);

    const report = await Promise.allSettled(Object.entries(toTrigger.trackers).map(async ([a, b]: [any, any]) => applyTrigger(result, query, a, b, call)));
    await Promise.allSettled(report.filter((r: any) => 'fulfilled' !== r.status).map(processTriggerError))

    debugHookDeleteReferences('report %j', toTrigger);

    return result;
}

function computeToTrigger(referenceTargets: any) {
    return Object.entries(referenceTargets).reduce((acc: any, [name, rules]: [string, any]) => {
        return Object.entries(rules).reduce((acc1: any, [_, {trackedFields, ...rule}]: [string, any]) => {
            acc1.trackers = acc1.trackers || {};
            acc1.trackers[name] = acc1.trackers[name] || {};
            acc1.trackers[name].config = rule;
            return acc1;
        }, acc);
    }, {trackers: {}} as any)
}

function computeDeleteCriteriaForTrigger(result: any, query: any, tracker: any) {
    const joinFieldName = tracker.config['join'];
    const idFieldName = tracker.config['idField'] || 'id';
    const fieldValue = result[idFieldName] || ((query || {})['oldData'] || {})[idFieldName];

    if (!joinFieldName || (undefined === fieldValue)) return undefined;
    return {[joinFieldName]: fieldValue};
}
function computeDeleteFieldsForTrigger(criteria) {
    const keys = {id: true, cursor: true};
    Object.keys(criteria).reduce((acc: any, n: string) => Object.assign(acc, {[n]: true}), keys);
    const keyNames = Object.keys(keys);
    keyNames.sort();
    return keyNames;
}
async function applyTrigger(result: any, query: any, name: string, tracker: any, call: Function) {
    const deleteCriteria = computeDeleteCriteriaForTrigger(result, query, tracker);
    const deleteFields = computeDeleteFieldsForTrigger(deleteCriteria);

    if (!deleteCriteria) return; // unable to detect criteria to filter items

    debugHookDeleteReferences('apply %j %j', deleteCriteria, deleteFields);

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
                criteria: deleteCriteria,
                fields: deleteFields,
            });
            await Promise.allSettled(((page || {}).items || []).map(async item => {
                try {
                    // noinspection UnnecessaryLocalVariableJS
                    const rr = await call(`${name}_delete`, {
                        id: item.id,
                    });
                    // @todo log ?
                    return rr;
                } catch (e: any) {
                    // @todo log?
                    throw e;
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
        console.error('Delete references FAILED', {name, tracker}, e);
    }
}

async function processTriggerError(report: any) {
    console.error('Delete references trigger ERROR', JSON.stringify(report, null, 4));
}