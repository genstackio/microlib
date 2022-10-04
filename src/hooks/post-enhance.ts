import presets from '../services/presets';
import caller from '../services/caller';

const buildPostEnhancer = ({type, config = {}}, dir) => {
    let g;
    if ('@' === type.slice(0, 1)) {
        g = require(`../enhancers/post/${type.slice(1)}`);
    } else {
        g = require(`${dir}/enhancers/post/${type}`);
    }
    if (!g || !g.supports) g = {...(g || {}), supports: () => false};
    if (!g.enhance) g ={...(g || {}), enhance: async () => {}};
    return g;
};

// noinspection JSUnusedGlobalSymbols
export default ({o, model: {enhancers = {}}, dir}) => async (result, query) => {
    const on = o.replace(/^.+_([^_]+)$/, '$1');
    const enhs = (enhancers[on] || {})['post'] || [];
    enhs.length && Object.assign(
        result,
        await presets.applyPresets(
            'post',
            query,
            o.replace(/_[^_]+$/, ''),
            result || {},
            (query.data || {}).presets,
            enhs,
            async (props) => buildPostEnhancer(props, dir),
            async (dsn, params = {}, options = {}) =>
                caller.execute(dsn, params, `${dir}/services/crud`, options)
        )
    );

    return result;
}