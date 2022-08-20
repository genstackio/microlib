import business from '../services/business';

// noinspection JSUnusedGlobalSymbols
export default ({rule, dir}) => async (a?: any, b?: any, c?: any) => {
    let query: any = a;
    let result: any = undefined;
    let vars: any = c || {};
    if (b) {
        query = b;
        result = a;
    }
    await business.apply(rule, vars, query, result, true, dir);

    return result ? result : query;
}