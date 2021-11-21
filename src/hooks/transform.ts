const getTransformer = (type, dir) => {
    let t;
    if ('@' === type.substr(0, 1)) {
        t = require('../transformers');
        type = type.substr(1);
    } else {
        t = require(`${dir}/transformers`);
    }
    return t[type] || (() => x => x);
};

export default ({model: {transformers = {}}, dir}) => async data => {
    data.originalData = data.originalData || {};
    await Promise.all(Object.entries(data.data).map(async ([k, v]) => {
        if (transformers[k]) {
            data.originalData[k] = v;
            data.data[k] = await transformers[k].reduce(async (acc, {type, config}) => {
                acc = await acc;
                return getTransformer(type, dir)(config)(acc, data);
            }, Promise.resolve(v));
        }
    }));
    return data;
}