const getTracker = (type: string, dir) => {
    let v;
    if ('@' === type.slice(0, 1)) {
        v = require('../trackers');
        type = type.slice(1);
    } else {
        v = require(`${dir}/trackers`);
    }
    return v[type] || v.unknown;
};

export default ({type, dir, track: def}: any) => async (result, query) => {
    const tracker = getTracker(type || '@unknown', dir);
    await tracker({...def, dir})(result, query);
    return result;
}