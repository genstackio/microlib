async function applyPresets(phase, query, type, data, codes = [], fetchPreset, enhs, buildEnhancer, call, metas = {}) {
    const presets = (
        await Promise.allSettled(
            (codes || []).map(async p => fetchPreset(type, p))
        )
    ).map(
        (x: any, index: number) => {
            if (x.status === 'fulfilled') {
                return x.value
            }
            console.error(`Unable to fetch presets of type '${type}' named '${codes[index]}'`, x?.reason?.message);
            return undefined;
        }
    ).filter(x => !!x);

    const joins = {};

    const enhsBuilt = (await Promise.all(enhs.map(async enh => buildEnhancer('string' === typeof enh ? {type: enh, config: {}} : enh)))).filter(x => !!x && x.supports);

    return presets.reduce(async (acc, p) => applyPreset(phase, query, type, await acc, p, enhsBuilt.filter(x => x.supports((p || {}).parsedDefinition || {})), call, metas, joins), data);
}

async function applyPreset(phase, query, type, data, preset, enhsBuilt, call, metas, joins) {
    return (enhsBuilt || []).reduce(async (acc, enh) => {
        acc = (await acc) || {};
        return {...acc, ...((await enh.enhance(acc, (preset || {}).parsedDefinition || {}, call, metas, joins)) || {})};
    }
    , Promise.resolve(data));
}

export default {
    applyPresets,
};