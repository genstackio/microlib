const buildValueGenerator = ({type, config = {}}, dir): Function|undefined => {
    let g;
    if ('@' === type.substr(0, 1)) {
        g = require('../dynamics');
        type = type.substr(1);
    } else {
        g = require(`${dir}/dynamics`);
    }
    return (g[type.replace(/-/g, '_')] || g.empty)({...config, dir});
};

async function populateItem(result, query, defs, selectedFields, dir) {
    await Promise.all(selectedFields.map(async k => {
        if (!defs[k]) return;
        const g = buildValueGenerator(<any>defs[k], dir);
        if (g) {
            result[k] = await g(result, query);
            query.resultAutoPopulated = query.resultAutoPopulated || {};
            query.resultAutoPopulated[k] = true;
        }
        // currently, if the generator/dynamics-type is unknown (does not exist), there is no errors.
    }));
    return result;
}

export default ({model, dir}) => async (result, query, mode: string = 'item') => {
    const selectedFields = (query.fields && query.fields.length) ? query.fields : Object.keys(model.dynamics || {});
    const defs = model.dynamics || {};
    switch (mode) {
        case 'page':
            result.items = await Promise.all(result.items.map(item => populateItem({...item}, query, defs, selectedFields, dir)))
            break;
        default:
        case 'item':
            result = await populateItem(result, query, defs, selectedFields, dir)
            break;
    }
    return result;
}
