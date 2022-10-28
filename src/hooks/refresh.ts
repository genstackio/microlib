const buildValueGenerator = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.substr(0, 1)) {
        g = require('../refreshers');
        type = type.substr(1);
    } else {
        g = require(`${dir}/refreshers`);
    }
    return (g[type.replace(/-/g, '_')] || g.empty)(config);
};

export default ({model, dir}) => async data => {
    const refreshKey = 'watchTargets';
    await Promise.all(Object.entries(model[refreshKey] || {}).map(async ([k, def]) => {
        if (!data || !data.data || !data.data.hasOwnProperty(k)) return;
        await Promise.all((def as any[] || []).map(async (dd) => {
            dd = 'string' === typeof dd ? {field: dd} : dd;
            !dd.type && (dd.type = `${model.name}_${dd}`);
            if (!dd['field']) return;
            const kk = dd['field'];
            const v = await buildValueGenerator(<any>dd, dir)(data[k], data);
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