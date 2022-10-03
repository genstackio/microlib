const transformers = {
    upper: v => ('string' === typeof v) ? v.toUpperCase() : v,
    lower: v => ('string' === typeof v) ? v.toLowerCase() : v,
    split: (v, char) => ('string' === typeof v) ? v.split(char) : [],
    date: v => ('string' === typeof v) ? new Date(Date.parse(v)) : (('number' === typeof v) ? new Date(v) : undefined),
    keys: v => ('object' === typeof v) ? Object.keys(v) : (Array.isArray(v) ? v.keys() : []),
    values: v => ('object' === typeof v) ? Object.values(v) : (Array.isArray(v) ? v.values() : []),
    len: v => v.length,
};

let m: any = undefined;

export function getMozjexl() {
    if (!m) {
        m = require('mozjexl');
        Object.entries(transformers).forEach(([k, v]) => m.addTransform(k, v));
    }
    return m;
}
export async function evaluate(expression: string, vars: any = {}) {
    return getMozjexl().eval(expression, vars)
}

export default evaluate;