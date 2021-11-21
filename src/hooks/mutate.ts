const getMutator = (type, dir) => {
    let m;
    if ('@' === type.substr(0, 1)) {
        m = require('../mutators');
        type = type.substr(1);
    } else {
        m = require(`${dir}/mutators`)
    }
    return (m[type] || (() => x => x));
};

export default ({type, dir, ...config}) => async data => getMutator(type, dir)(config)(data)