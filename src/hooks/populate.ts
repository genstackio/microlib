const buildValueGenerator = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.substr(0, 1)) {
        g = require('../populators');
        type = type.substr(1);
    } else {
        g = require(`${dir}/populators`);
    }
    return (g[type.replace(/-/g, '_')] || g.empty)(config);
};

export default ({model, dir, prefix = undefined}) => async data => {
    const valuesKey = prefix ? `${prefix}Values` : 'values';
    let v;
    data.autoPopulated = data.autoPopulated || {};
    await Promise.all(Object.entries(model[valuesKey] || {}).map(async ([k, def]) => {
        v = await buildValueGenerator(<any>def, dir)(data);
        if ('**unchanged**' !== v) {
            if ('**clear**' === v) {
                data.data[k] = undefined;
            } else {
                data.data[k] = v;
            }
            data.autoPopulated[k] = true;
        }
    }));
    return data;
}