import business from '../services/business';

// noinspection JSUnusedGlobalSymbols
export default ({rule, dir}) => async (a, b) => {
    let query: any = a;
    let result: any = undefined;
    let vars: any = {};
    if (b) {
        query = b;
        result = a;
    }
    await business.apply(rule, vars, query, result, true, dir);

    return result ? result : query;
}