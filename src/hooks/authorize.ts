import AuthorizeError from "../errors/AuthorizeError";

const buildAuthorizer = ({type, config = {}}, dir) => {
    let a;
    if ('@' === type.substr(0, 1)) {
        a = require('../authorizers');
        type = type.substr(1);
    } else {
        a = require(`${dir}/authorizers`);
    }
    return (a[type.replace(/-/g, '_')] || a.denied)(config);
};

const checkAuthorizer = async (f, data, def, dir) => {
    if (!def || !def.type) throw new Error(`No authorizer type specified for '${f}'`);
    return buildAuthorizer(def, dir)((data.data || {})[f], data);
}
export default ({model: {authorizers = {}}, dir}) => async data => {
    if (!authorizers) return data;
    const fields = Object.keys(authorizers);
    if (!fields.length) return data;
    const errors = ((await Promise.all(fields.map(async f => {
        const xx = (await Promise.all(authorizers[f].map(async a => {
            try {
                await checkAuthorizer(f, data, a, dir);
                return undefined;
            } catch (e: any) {
                return e;
            }
        }))).filter(x => !!x);
        return (xx.length) ? [f, xx] : undefined;
    }))).filter(x => !!x) as any[]).reduce((acc, [a, b]) => {
        return Object.assign(acc, {[a]: b});
    }, {});
    if (0 < Object.keys(errors).length) throw new AuthorizeError(errors)
    return data;
}