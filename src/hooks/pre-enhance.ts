import presets from '../services/presets';
import caller from '../services/caller';

const buildPreEnhancer = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.slice(0, 1)) {
        g = require(`../enhancers/pre/${type.slice(1)}`);
    } else {
        g = require(`${dir}/enhancers/pre/${type}`);
    }
    if (!g || !g.supports) g = {...(g || {}), supports: () => false};
    if (!g.enhance) g ={...(g || {}), enhance: async () => {}};
    return g;
};

async function fetchPreset(type: string, code: string, options: {dir: string}) {
    return require(`${options.dir}/services/presets`).fetchPreset(type, code, options);
}

// noinspection JSUnusedGlobalSymbols
export default ({o, model: {enhancers = {}}, dir}) => async (query) => {
    const on = o.replace(/^.+_([^_]+)$/, '$1');
    const enhs = (enhancers[on] || {})['pre'] || [];
    enhs.length && Object.assign(
        query.data,
        await presets.applyPresets(
            'pre',
            query,
            o.replace(/_[^_]+$/, ''),
            query.data || {},
            (query.data || {}).presets,
            async (type: string, code: string) => fetchPreset(type, code, {dir}),
            enhs,
            async (props) => buildPreEnhancer(props, dir),
            async (dsn, params = {}, options = {}) =>
                caller.execute(dsn, params, `${dir}/services/crud`, options)
        )
    );

    return query;
}