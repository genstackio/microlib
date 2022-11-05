import caller from '../services/caller';
import d from 'debug';

const debugHookPrefetch = d('micro:hooks:prefetch');

// noinspection JSUnusedGlobalSymbols
export default config => async query => {
    let fields = Object.keys({
        ...(await buildFieldsFromRequires(config, query)),
        ...(await buildFieldsFromPrefetchs(config, query))
    });

    debugHookPrefetch('need to prefetch %j', fields);

    if (!fields.length) return query;

    fields = fields.sort();
    const {model: {name}, dir} = config;
    let need = true;

    if (query.oldData) need = !!fields.find(f => undefined === query.oldData[f]);
    if (need) query.oldData = await caller.execute(`${name}_get`, {id: query.id, fields}, `${dir}/services/crud`);

    return query;
}

async function buildFieldsFromRequires({model: {requires = {}}}, query: any) {
    let requestedFields = Object.keys([...(query?.fields || []), ...(query?.selections?.items?.fields || [])].reduce((acc, k) => Object.assign(acc, {[k]: true}), {} as any));
    requestedFields = requestedFields.sort();

    return requestedFields.reduce((acc, k) => {
        return (requires[k] || []).reduce((acc2, kk) => Object.assign(acc2, {[kk]: true}), acc);
    }, {} as any);
}

// noinspection JSUnusedLocalSymbols
async function buildFieldsFromPrefetchs({model: {prefetchs = {}}, operationName}, query: any) {
    if (!prefetchs || !prefetchs[operationName]) return {};
    return prefetchs[operationName];
}