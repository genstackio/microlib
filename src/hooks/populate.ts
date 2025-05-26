const buildValueGenerator = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.slice(0, 1)) {
        g = require('../populators');
        type = type.slice(1);
    } else {
        g = require(`${dir}/populators`);
    }
    return (g[type.replace(/-/g, '_')] || g.empty)(config);
};

export default ({model, dir, prefix = undefined}) => async data => {
    const valuesKey = prefix ? `${prefix}Values` : 'values';
    let v;
    data.autoPopulated = data.autoPopulated || {};
    const MAX_LOOP = 20;
    const passes = Object.entries(model[valuesKey] || {}).reduce((acc, [k, v]: [string, any]) => {
        v.pass = v.pass || 1;
        const kk = Number(v.pass);
        let ii = 0;
        while (acc.length < kk) {
            if (ii > MAX_LOOP) throw new Error(`Too many populate passes for ${k}`);
            acc.push([]);
            ii++;
        }
        acc[kk - 1].push([k, v]);
        return acc;
    }, [] as any[])

    await passes.reduce(async (acc, items) => {
        await acc;
        return Promise.all(items.map(async ([k, def]) => {
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
    }, Promise.resolve(undefined));
    return data;
}
