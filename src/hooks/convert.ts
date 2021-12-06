const getConverter = (type, dir) => {
    let t;
    if ('@' === type.substr(0, 1)) {
        t = require('../converters');
        type = type.substr(1);
    } else {
        t = require(`${dir}/converters`);
    }
    return t[type] || (() => x => x);
};

export default ({model: {converters = {}}, dir}) => async (data, query) => {
    data = data || {};
    const dataKeys = Object.keys(data).reduce((acc, k) => Object.assign(acc, {[k]: true}), {});
    await Promise.all(Object.entries(converters).map(async ([k, attrConverters]) => {
        if (!dataKeys[k]) {
            // data does not contain the `k` key, filter to keep only converters that are marked as `always`
            attrConverters = (attrConverters as ({always?: boolean}[])).filter(x => !!x.always);
        }
        if (!(attrConverters as ({always?: boolean}[])).length) return;
        data[k] = await (attrConverters as ({type: string, config?: object}[])).reduce(async (acc, {type, config}) => {
            acc = await acc;
            return getConverter(type, dir)({...config, attribute: k})(acc, data, query);
        }, Promise.resolve(data[k]));
    }));
    return data;
}