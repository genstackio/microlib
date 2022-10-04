async function applyPresets(phase, query, type, data, codes = [], fetchPreset, enhs, buildEnhancer, call, metas = {}) {
    const presets = (
        await Promise.allSettled(
            (codes || []).map(async p => fetchPreset(type, p))
        )
    ).map(
        x => {
            if (x.status === 'fulfilled') {
                return x.value
            }
            console.error(`Unable to fetch one of the presets of type '${type}'`, x?.reason?.message);
            return undefined;
        }
    ).filter(x => !!x);

    const joins = {};

    const enhsBuilt = enhs.map(enh => buildEnhancer('string' === typeof enh ? {type: enh, config: {}} : enh)).filter(x => !!x && x.supports);

    return presets.reduce(async (acc, p) => applyPreset(phase, query, type, await acc, p, enhsBuilt.filter(x => x.supports(p)), call, metas, joins), data);
}

async function applyPreset(phase, query, type, data, preset, enhsBuilt, call, metas, joins) {
    return (enhsBuilt || []).reduce(async (acc, enh) => {
        acc = await acc;
        return (await enh.enhance(acc, (preset || {}).parsedDefinition || {}, call, metas, joins)) || acc;
    }
    , Promise.resolve(data));
}

export default {
    applyPresets,
};