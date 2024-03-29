const buildValueGenerator = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.slice(0, 1)) {
        g = require('../refreshers');
        type = type.slice(1);
    } else {
        g = require(`${dir}/refreshers`);
    }
    const fn = (g[type.replace(/-/g, '_')] || g.empty);
    if (!fn) throw new Error(`Unknown refresher '${type}'`);
    return fn(config);
};

// noinspection JSUnusedGlobalSymbols
export default ({model, dir}) => async data => {
    const refreshKey = 'watchTargets';
    await Promise.all(Object.entries(model[refreshKey] || {}).map(async ([k, def]) => {
        if (!data || !data.data || !data.data.hasOwnProperty(k)) return;
        await Promise.all((def as any[] || []).map(async (dd) => {
            dd = 'string' === typeof dd ? {field: dd} : dd;
            if (!dd['field']) return;
            !dd.type && (dd.type = `${model.name}_${dd.field}`);
            const kk = dd['field'];
            const v = await buildValueGenerator(<any>dd, dir)(data.data[k], data);
            if ('**unchanged**' !== v) {
                if ('**clear**' === v) {
                    data.data[kk] = undefined;
                } else {
                    data.data[kk] = v;
                }
                data.autoPopulated[kk] = true;
            }
        }));
    }));
    return data;
}