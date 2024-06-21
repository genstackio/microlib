const getPretransformer = (type, dir) => {
    let t;
    if ('@' === type.slice(0, 1)) {
        t = require('../pretransformers');
        type = type.slice(1);
    } else {
        t = require(`${dir}/pretransformers`);
    }
    return t[type] || (() => x => x);
};

// noinspection JSUnusedGlobalSymbols
export default ({model: {pretransformers = {}}, dir}) => async data => {
    data.originalData = data.originalData || {};
    await Promise.all(Object.entries(data.data).map(async ([k, v]) => {
        if (pretransformers[k]) {
            data.originalData[k] = v;
            data.data[k] = await pretransformers[k].reduce(async (acc, {type, config}) => {
                acc = await acc;
                return getPretransformer(type, dir)(config)(acc, data);
            }, Promise.resolve(v));
        }
    }));
    return data;
}