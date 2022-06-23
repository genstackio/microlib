const buildValueGenerator = ({type, config = {}, field, isFieldSelected, fieldSelections = {}}: {type?: string, config?: any, field: string, isFieldSelected: boolean, fieldSelections?: any}, dir): Function|undefined => {
    let g;
    type = type || 'unknown';
    if ('@' === type.slice(0, 1)) {
        g = require('../dynamics');
        type = type.slice(1);
    } else {
        g = require(`${dir}/dynamics`);
    }
    const fn = g[type.replace(/-/g, '_')] || g.empty;
    if (!fn) throw new Error(`Unknown generator '${type}'`);
    return fn({...config, field, isFieldSelected, fieldSelections, dir});
};

async function populateItem(result, query, defs, selectedFields, realSelectedFields, fieldsSelections, dir) {
    await Promise.all(selectedFields.map(async k => {
        if (!defs[k]) return;
        const g = buildValueGenerator({...<any>defs[k], field: k, isFieldSelected: (realSelectedFields || []).includes(k), fieldSelections: (fieldsSelections || {})[k]}, dir);
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
    let selectedFields = (query.fields && query.fields.length) ? query.fields : Object.keys(model.dynamics || {});
    let realSelectedFields = Object.keys(query.selections || {});
    let fieldsSelections = query.selections || {};
    const defs = model.dynamics || {};
    switch (mode) {
        case 'page':
            selectedFields = query.selections?.items?.fields || Object.keys(model.dynamics || {});
            realSelectedFields = query.selections?.items?.fields || [];
            fieldsSelections = query.selections?.items?.selections || {};
            result.items = await Promise.all(result.items.map(item => populateItem({...item}, query, defs, selectedFields, realSelectedFields, fieldsSelections, dir)))
            break;
        default:
        case 'item':
            result = await populateItem(result, query, defs, selectedFields, realSelectedFields, fieldsSelections, dir)
            break;
    }
    return result;
}
