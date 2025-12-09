import caller from "../services/caller";
import {mHookError} from "../m";

// noinspection JSUnusedGlobalSymbols
export default ({model: {referenceTargets = {}}, dir}) => async (result: any, query: any) => {
    const call = async (name: string, ...args: any[]) => caller.execute(name, args, `${dir}/services/crud`);
    const changedFields = computeChangedFields(result, (query || {}).oldData);
    if (!changedFields || !Object.keys(changedFields).length) return result;
    const toTrigger = computeToTriggerFromChangedFields(changedFields, referenceTargets);

    if (!toTrigger || !toTrigger.trackers || !Object.keys(toTrigger.trackers).length) return result;

    const report = await Promise.allSettled(Object.entries(toTrigger.trackers).map(async ([a, b]: [any, any]) => applyTrigger(result, query, a, b, call)));
    await Promise.allSettled(report.filter((r: any) => 'fulfilled' !== r.status).map(processTriggerError))

    return result;
}

function hasValueChanged(a: any, b: any) {
    if (a === b) return false;
    switch (typeof a) {
        case 'undefined': return true;
        case 'string': return true;
        case 'boolean': return true;
        case 'number': return true;
        case 'object':
            if ((null === a) || (null === b)) return true;
            // @todo optimize
            return true;
        default:
            // @todo optimize
            return true;
    }
}

function computeChangedFields(b: any, a: any = {}) {
    return Object.entries(b).reduce((acc: any, [name, value]: [string, any]) => {
        if (!hasValueChanged(value, a[name])) return acc;
        acc[name] = [value, a[name]];
        return acc;
    }, {} as any);
}

function computeToTriggerFromChangedFields(changedFields: any, referenceTargets: any) {
    return Object.entries(referenceTargets).reduce((acc: any, [name, rules]: [string, any]) => {
        return Object.entries(rules).reduce((acc1, [_, {trackedFields, fieldTargets, ...rule }]: [any, any]) => {
            return Object.entries(changedFields).reduce((acc2: any, [name2, cf]: [string, any]) => {
                if (!trackedFields[name2]) return acc2;
                acc2.trackers = acc2.trackers || {};
                acc2.trackedFields[name2] = acc2.trackedFields[name2] || {};
                acc2.trackedFields[name2][name] = rule;
                acc2.trackers[name] = acc2.trackers[name] || {};
                acc2.trackers[name].triggerFields = acc2.trackers[name].triggerFields || {};
                acc2.trackers[name].triggerFields[name2] = {...rule, oldValue: cf[1], newValue: cf[0]};
                acc2.trackers[name].targetFields = {...(acc2.trackers[name].targetFields || {}), ...(fieldTargets || {})};
                acc2.trackers[name].config = rule;
                return acc2;
            }, acc1);
        }, acc);
    }, {trackedFields: {}, trackers: {}} as any)
}

function computeUpdateDataForTrigger(result: any, query: any, tracker: any) {
    const joinFieldName = tracker.config['join'];
    const idFieldName = tracker.config['idField'] || 'id';
    const fieldValue = result[idFieldName] || ((query || {})['oldData'] || {})[idFieldName];

    if (!joinFieldName || (undefined === fieldValue)) return undefined;
    return {[joinFieldName]: fieldValue};
}

function computeUpdateCriteriaForTrigger(result: any, query: any, tracker: any) {
    const joinFieldName = tracker.config['join'];
    const idFieldName = tracker.config['idField'] || 'id';
    const fieldValue = result[idFieldName] || ((query || {})['oldData'] || {})[idFieldName];

    if (!joinFieldName || (undefined === fieldValue)) return undefined;
    return {[joinFieldName]: fieldValue};
}
function computeUpdateFieldsForTrigger(criteria: any, data: any) {
    const keys = {id: true, cursor: true};
    Object.keys(criteria).reduce((acc: any, n: string) => Object.assign(acc, {[n]: true}), keys);
    Object.keys(data).reduce((acc: any, n: string) => Object.assign(acc, {[n]: true}), keys);
    const keyNames = Object.keys(keys);
    keyNames.sort();
    return keyNames;
}
function computeUpdateTrackedFieldsForTrigger(tracker) {
    const targetMap = Object.entries(tracker.targetFields || {}).reduce((acc: any, [k, v]: [string, any]) => {
        acc[v] = k;
        return acc;
    }, {} as any);
    return Object.entries(tracker.triggerFields).reduce((acc: any, [k, {newValue}]: [string, any]) => {
        acc.fields.push(k);
        acc.values[k] = newValue;
        const kk = targetMap[k];
        if (kk) {
            acc.targetValues[kk] = newValue;
        }
        return acc;
    }, {fields: [], values: {}, targetValues: {}} as any);
}
async function applyTrigger(result: any, query: any, name: string, tracker: any, call: Function) {
    const updateCriteria = computeUpdateCriteriaForTrigger(result, query, tracker);
    const updateData = computeUpdateDataForTrigger(result, query, tracker);
    const updateFields = computeUpdateFieldsForTrigger(updateCriteria, updateData);
    const updateTrackedFields = computeUpdateTrackedFieldsForTrigger(tracker);

    if (!updateCriteria) return; // unable to detect criteria to filter items
    if (!updateData || !Object.keys(updateData).length) return; // nothing to update

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
                fields: [...updateFields, ...updateTrackedFields.fields],
            });
            await Promise.allSettled(((page || {}).items || []).map(async item => {
                const itemChangedData = computeChangedFields({...updateData, ...updateTrackedFields.targetValues}, item);
                if (!itemChangedData || !Object.keys(itemChangedData).length) return;
                const changedData = updateData;
                if (!changedData || !Object.keys(changedData).length) return;
                try {
                    // keep the await
                    return await call(`${name}_update`, {
                        id: item.id,
                        data: changedData,
                    });
                } catch (e: any) {
                    await mHookError(e, 'update-references', {data: {item, name, changedData, offset, limit, updateFields, updateCriteria, maxSteps, page, step, result, tracker}})
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
        await mHookError(e, 'update-references', {data: {name, result, tracker}})
    }
}

async function processTriggerError(report: any) {
    await mHookError(new Error('Update references trigger error'), 'update-references', {data: {report}})
}
