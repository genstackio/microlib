const pattern = /^\[\[[^\]]+]]$/;

export function computeConfig(c, d) {
    if ('object' === typeof c) return Object.entries(c).reduce((acc, [k, v]) =>
            Object.assign(acc, {[k]: computeConfig(v, d)})
        , {});
    if (Array.isArray(c)) return c.map(v => computeConfig(v, d));
    if (('string' === typeof c) && pattern.test(c)) return ('[[value]]' === c) ? d : d[c.substr(2, c.length - 4)];
    return c;
}

export default computeConfig;