async function applyPresets(phase, query, type, data, codes = [], fetchPreset, enhs, buildEnhancer, call, metas = {}) {
    const presets = (
        await Promise.allSettled(
            (codes || []).map(async p => fetchPreset(type, p))
        )
    ).map(
        x => (x.status === 'fulfilled') ? x.value : undefined
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