import caller from '../services/caller';

const buildTransitionValue = def => {
    switch (def.type) {
        case '@value': return def.config.value;
        default: throw new Error(`Unknown transition value type '${def.type}'`);
    }
};

// noinspection JSUnusedGlobalSymbols
export default ({model: {name, autoTransitionTo = {}}, dir}) => async data => {
    const fields = Object.keys(autoTransitionTo);
    if (!fields.length) return data;
    const computedData = fields.reduce((acc, k) => {
        const vv = buildTransitionValue(autoTransitionTo[k]);
        if ('**unchanged**' !== vv) acc[k] = vv;
        return acc;
    }, {});
    if (!computedData || !Object.keys(computedData).length) return data;
    const result = await caller.execute(`${name}_update`, {id: data.id, data: computedData}, `${dir}/services/crud`);
    return {...(data || {}), ...(result || {})};
}