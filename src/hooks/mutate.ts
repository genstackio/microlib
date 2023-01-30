const getMutator = (type, dir) => {
    let m;
    if ('@' === type.slice(0, 1)) {
        m = require('../mutators');
        type = type.slice(1);
    } else {
        m = require(`${dir}/mutators`)
    }
    return (m[type] || (() => x => x));
};

// noinspection JSUnusedGlobalSymbols
export default ({type, dir, ...config}) => async data => getMutator(type, dir)(config)(data)