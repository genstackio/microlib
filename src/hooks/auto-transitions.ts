import caller from '../services/caller';

const buildTransitionValue = def => {
    switch (def.type) {
        case '@value': return def.config.value;
        default: throw new Error(`Unknown transition value type '${def.type}'`);
    }
};

export default ({model: {name, autoTransitionTo = {}}, dir}) => async data => {
    const fields = Object.keys(autoTransitionTo);
    if (!fields.length) return data;
    const computedData = fields.reduce((acc, k) => {
        acc[k] = buildTransitionValue(autoTransitionTo[k]);
        return acc;
    }, {});
    const result = await caller.execute(`${name}_update`, {id: data.id, data: computedData}, `${dir}/services/crud`);
    return {...(data || {}), ...(result || {})};
}