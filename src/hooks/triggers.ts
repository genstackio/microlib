const buildTrigger = ({type, config = {}}, dir): Function|undefined => {
    let g;
    if ('@' === type.substr(0, 1)) {
        g = require('../triggers');
        type = type.substr(1);
    } else {
        g = require(`${dir}/triggers`);
    }
    return (g[type.replace(/-/g, '_')] || g.empty)({...config, dir});
};

async function itemTriggers(result, query, defs, dir) {
    await Promise.all(Object.entries(defs).map(async ([k, dd]: [string, any]) => {
        const t = buildTrigger(<any>dd, dir);
        if (t) {
            await t(result, query);
        }
    }));
    return result;
}

export default ({model, dir}) => async (result, query, mode: string = 'item') => {
    const defs = model.triggers || {};
    switch (mode) {
        case 'page':
            result.items = await Promise.all(result.items.map(item => itemTriggers({...item}, query, defs, dir)))
            break;
        default:
        case 'item':
            result = await itemTriggers(result, query, defs, dir)
            break;
    }
    return result;
}
