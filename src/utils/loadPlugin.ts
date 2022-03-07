import findPlugin from "./findPlugin";

export function loadPlugin(pluginType, cfg, {dir}) {
    const t = typeof cfg;
    if ('function' === t) return cfg;
    if ('string' === t) cfg = {type: '@operation', config: {operation: cfg}};
    const {type, config = {}} = cfg || {};
    return findPlugin(pluginType, type, dir)({...config, dir});
}

export default loadPlugin;