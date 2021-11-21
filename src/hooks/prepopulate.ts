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

const findCascadeMatchingCase = (v, map) => (map && map[v]) ? map[v] : undefined;

const buildCascadeValues = async (def, data, dir) =>
    Object.entries(def || {}).reduce(async (acc, [k, v]) => {
        acc = (await acc) as any;
        const d = ('string' === typeof v) ? {type: v} : <any>v;
        let vv;
        if (('**clear**' !== d.type) && ('**unchanged**' !== d.type)) {
            vv = await buildValueGenerator(d, dir)(data);
        } else {
            vv = d.type;
        }
        if ('**unchanged**' !== vv) acc[k] = vv;
        return acc as Promise<any>;
    }, Promise.resolve({}))
;
export default ({model, dir, prefix = undefined}) => async data => {
    const defaultValuesKey = prefix ? `${prefix}DefaultValues` : 'defaultValues';
    const cascadeValuesKey = 'cascadeValues';
    let v;
    data.autoPopulated = data.autoPopulated || {};
    await Promise.all(Object.entries(model[defaultValuesKey] || {}).map(async ([k, def]) => {
        if (data.data[k]) return;
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
    await Promise.all(Object.entries(model[cascadeValuesKey] || {}).map(async ([k, def]) => {
        const matchCase = findCascadeMatchingCase(data.data[k], def);
        if (!matchCase) return;
        const values = await buildCascadeValues(matchCase, data, dir);
        Object.entries(values).forEach(([kk, vv]) => {
            if ('**unchanged**' !== vv) {
                if ('**clear**' === vv) {
                    data.data[kk] = undefined
                } else {
                    data.data[kk] = vv;
                }
                data.autoPopulated[kk] = true;
            }
        })
    }));
    return data;
}