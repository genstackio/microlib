export default ({model}) => async (query) => {
    const selectedFields = (query.fields && query.fields.length) ? query.fields : Object.keys(model.dynamics || {});
    query.fields = buildFields(selectedFields, model);
    return query;
}

function buildFields(fields, model, all = {}) {
    return Object.keys(fields.reduce((acc, k) => {
        if (all[k]) return acc;
        acc[k] = true;
        acc = buildFields((model.requires || {})[k] || [], model, {...all, ...acc}).reduce((acc2, k2) => {
            acc2[k2] = true;
            return acc2;
        }, acc);
        return acc;
    }, {} as any));
}