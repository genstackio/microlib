const map = {
    ids: populateIdsCriterium,
    in: populateInCriterium,
    eq: populateEqualCriterium,
    lt: populateLessThanCriterium,
    gt: populateGreaterThanCriterium,
    lte: populateLessThanOrEqualCriterium,
    gte: populateGreaterThanOrEqualCriterium,
    prefix: populatePrefixCriterium,
    exists: populateExistsCriterium,
    wildcard: populateWildcardCriterium,
    regex: populateRegexCriterium,
    range: populateRangeCriterium,
    rangelt: populateRangeLtCriterium,
    rangegt: populateRangeGtCriterium,
    rangegtlt: populateRangeGtLtCriterium,
};

function buildSearchIndexInputFromSearchQuery(sq: any): any {
    if (!sq) return {};
    const criteria = mutateCriteria(sq.criteria);
    const sort = mutateSort(sq.sort);
    const q: {query?: any; sort?: any} = {};
    if (criteria && !!criteria.length) {
        if (criteria.length > 1) q.query = {bool: {must: criteria}};
        else q.query = criteria[0];
    }
    if (sort) q.sort = sort;
    return q;
}

function populateSearchIndexInputFromSearchQueryCriterium(c) {
    const t = (c.operator || '').toLowerCase();
    const builder = map[t];
    if (!builder) throw new Error(`Unknown criterium type '${t}'`);
    return builder(c);
}

function populateIdsCriterium(c: any): any {
    return {ids: {[c.field]: {values: getCriteriumValue(c, undefined, true)}}};
}

function populateEqualCriterium(c: any): any {
    return {term: {[c.field]: {value: getCriteriumValue(c)}}}
}

function populateInCriterium(c: any): any {
    return {terms: {[c.field]: {value: getCriteriumValue(c)}}}
}

function populateRangeCriterium(c: any): any {
    const [a, b] = getCriteriumValue(c, undefined, true);
    return {range: {[c.field]: {lte: b, gte: a}}}
}

function populateRangeLtCriterium(c: any): any {
    const [a, b] = getCriteriumValue(c, undefined, true);
    return {range: {[c.field]: {lt: b, gte: a}}}
}

function populateRangeGtCriterium(c: any): any {
    const [a, b] = getCriteriumValue(c, undefined, true);
    return {range: {[c.field]: {lte: b, gt: a}}}
}

function populateRangeGtLtCriterium(c: any): any {
    const [a, b] = getCriteriumValue(c, undefined, true);
    return {range: {[c.field]: {lt: b, gt: a}}}
}

function populateLessThanOrEqualCriterium(c: any): any {
    return {range: {[c.field]: {lte: getCriteriumValue(c)}}}
}

function populateGreaterThanOrEqualCriterium(c: any): any {
    return {range: {[c.field]: {gte: getCriteriumValue(c)}}}

}

function populateLessThanCriterium(c: any): any {
    return {range: {[c.field]: {lt: getCriteriumValue(c)}}}

}

function populateGreaterThanCriterium(c: any): any {
    return {range: {[c.field]: {gte: getCriteriumValue(c)}}}
}

function populatePrefixCriterium(c: any): any {
    return {prefix: {[c.field]: getCriteriumValue(c, 'string')}}
}

function populateExistsCriterium(c: any): any {
    return {exists: {field: c.field}}
}

function populateWildcardCriterium(c: any): any {
    return {wildcard: {[c.field]: {value: getCriteriumValue(c, 'string')}}}
}

function populateRegexCriterium(c: any): any {
    return {regex: {[c.field]: getCriteriumValue(c, 'string')}}
}

function getCriteriumValue({
                               type,
                               value,
                               listValue,
                               intValue,
                               intListValue,
                               floatValue,
                               floatListValue,
                               booleanValue,
                               booleanListValue
                           }: any, forcedType?: string, listMode?: boolean): any {
    type = forcedType || type;
    type = listMode ? ((type.slice(-2) === '[]') ? type : `${type}[]`) : type;

    switch ((type || '').toLowerCase()) {
        case 'int':
            return intValue;
        case 'int[]':
            return intListValue || [];
        case 'boolean':
            return booleanValue;
        case 'boolean[]':
            return booleanListValue || [];
        case 'float':
            return floatValue;
        case 'float[]':
            return floatListValue || [];
        case 'string':
            return value;
        case 'string[]':
            return listValue || [];
        default:
            return value;
    }
}

function mutateSort(rawSort: any): any {
    if (!rawSort || !rawSort.fields || !rawSort.fields.length) return undefined;
    return rawSort.fields.reduce((acc, {name, ...field}) => Object.assign(acc, {[name]: field}), {});
}

function mutateCriteria(rawCriteria: any): any {
    if (!rawCriteria || !rawCriteria.length) return undefined;
    return rawCriteria.map((c) => populateSearchIndexInputFromSearchQueryCriterium(c));
}

// noinspection JSUnusedGlobalSymbols
export default (model: any, cfg: any) => {
    if (!cfg || !cfg.package) throw new Error(`Unspecified searchapi package in configuration of backend searchapi`);
    const {createEnvSdk} = require(cfg.package);

    const sdk = createEnvSdk();

    async function search({index, offset, limit, sort, query: searchQuery}) {
        const {query, ...def} = buildSearchIndexInputFromSearchQuery(searchQuery) || {};
        return sdk.searchIndexPage(index, query, 'string' === typeof offset ? parseInt(offset) : offset, limit, def, (!!sort && ('string' === typeof sort)) ? sort : undefined);
    }

    return {
        search,
    }
}