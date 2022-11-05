// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
export default ({model}) => async (query, mode: string = 'item') => {
    let selectedFields = (query.fields && query.fields.length) ? query.fields : [];
    if ('page' === mode) {
        selectedFields = [...selectedFields, ...(query?.selections?.items?.fields || [])];
    }
    if (!selectedFields.length) selectedFields = Object.keys(model.dynamics || {});
    selectedFields = Object.keys(selectedFields.reduce((acc, k) => Object.assign(acc, {[k]: true}), {} as any));
    selectedFields = selectedFields.sort();
    query.fields = buildFields(selectedFields, model);
    return query;
}

function buildFields(fields, model, all = {}) {
    return Object.keys(fields.reduce((acc, k) => {
        if (all[k]) return acc;
        acc[k] = true;
        return buildFields((model.requires || {})[k] || [], model, {...all, ...acc}).reduce((acc2, k2) => {
            acc2[k2] = true;
            return acc2;
        }, acc);
    }, {} as any));
}