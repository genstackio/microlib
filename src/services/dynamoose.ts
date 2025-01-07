import dynamoose from 'dynamoose';
import DocumentNotFoundError from '@ohoareau/errors/lib/DocumentNotFoundError';
import d from 'debug';

const debugServiceDynamooseFind = d('micro:service:dynamoose:find');
const debugServiceDynamooseGet = d('micro:service:dynamoose:get');
const debugServiceDynamooseCreate = d('micro:service:dynamoose:create');
const debugServiceDynamooseDelete = d('micro:service:dynamoose:delete');
const debugServiceDynamooseUpdate = d('micro:service:dynamoose:update');

const globalOptions = ({name}) => ({
    prefix: process.env[`DYNAMODB_${name.toUpperCase()}_TABLE_PREFIX`] || process.env.DYNAMODB_TABLE_PREFIX || undefined,
    suffix: process.env[`DYNAMODB_${name.toUpperCase()}_TABLE_SUFFIX`] || process.env.DYNAMODB_TABLE_SUFFIX || undefined,
});

const parseAndModifiers = (modifiers, s, callback) =>
    s.split(/\s*&\s*/).reduce((acc, t, i) => {
        (i > 0) && acc.push({type: 'and'});
        return callback(acc, t);
    }, modifiers)
;
const parseOrModifiers = (modifiers, s, callback) =>
    s.split(/\s*\|\s*/).reduce((acc, t, i) => {
        (i > 0) && acc.push({type: 'or'});
        return callback(acc, t);
    }, modifiers)
;
const parseModifier = (modifiers, s) => {
    const [a, b, ...c] = s.split(':');
    const value = (c.join(':') || '').trim();
    modifiers.push({type: 'filter', attribute: a});
    switch (b) {
        case 'null':
            modifiers.push({type: 'null'});
            break;
        case 'eq':
            modifiers.push({type: 'eq', value});
            break;
        case 'lt':
            modifiers.push({type: 'lt', value});
            break;
        case 'le':
            modifiers.push({type: 'le', value});
            break;
        case 'gt':
            modifiers.push({type: 'gt', value});
            break;
        case 'ge':
            modifiers.push({type: 'ge', value});
            break;
        case '^':
            modifiers.push({type: 'beginsWith', value});
            break;
        case '[]':
            const [lowerBound, upperBound] = value.split(/\s*[;,]\s*/);
            modifiers.push({type: 'between', lowerBound, upperBound});
            break;
        case '*':
            modifiers.push({type: 'contains', value});
            break;
        case 'in':
            modifiers.push({type: 'in', values: value.split(/\s*[;,]\s*/)});
            break;
        default:
            throw new Error(`Unable to parse unknown modifier: ${b} (in: ${s})`);
    }
    return modifiers;
};

const buildQueryModifiers = s => {
    if (!s || !('string' === typeof s) || !s.length) return [];
    return parseOrModifiers([], s,
        (modifiers, s) => parseAndModifiers(modifiers, s,
            (modifiers, s) => parseModifier(modifiers, s)
        )
    );
};

const buildQueryDefinitionFromCriteria = (index, hashKey, rangeKey, criteria, scan = false) => {
    const localCriteria = {...criteria};
    hashKey = hashKey ? (Array.isArray(hashKey) ? hashKey : [index, hashKey]) : undefined;
    let modifiers = <any[]>[];
    let query:any = {};
    if (index) {
        modifiers.push({type: 'index', name: index});
        if (hashKey) {
            if (scan) {
                modifiers.push({type: 'where', name: hashKey[0]});
                modifiers.push({type: 'eq', value: hashKey[1]});
            } else {
                query[hashKey[0]] = {eq: hashKey[1]};
            }
        }
        if (rangeKey) {
            modifiers.push({type: 'where', name: rangeKey[0]});
            modifiers.push({type: rangeKey[1], ...(('undefined' === typeof rangeKey[2]) ? {} : (('object' === typeof rangeKey[2]) ? rangeKey[2] : {value: rangeKey[2]}))});
        }
    } else {
        if (hashKey) {
            if (!scan) {
                query[hashKey[0]] = {eq: hashKey[1]};
            }
        }
        if (rangeKey) {
            modifiers.push({type: 'where', name: rangeKey[0]});
            modifiers.push({type: rangeKey[1], ...(('undefined' === typeof rangeKey[2]) ? {} : (('object' === typeof rangeKey[2]) ? rangeKey[2] : {value: rangeKey[2]}))});
        }
    }
    if (localCriteria._) {
        const newModifiers = buildQueryModifiers(localCriteria._);
        if (modifiers?.length) throw new Error(
            `Overwritting modifiers [${JSON.stringify(modifiers)}] with [${JSON.stringify(newModifiers)}] for dynamoose query on index '${index}' (hashKey: ${hashKey}, rangeKey: ${rangeKey}, scan: ${scan ? 'true' : 'false'}, criteria: [${JSON.stringify(criteria)}])`
        );
        modifiers = newModifiers;
    }
    delete localCriteria._; // always delete even if empty
    const keys = Object.keys(localCriteria);
    if (keys.length) {
        query = keys.reduce((acc, k) => {
            acc[k] = {eq: localCriteria[k]};
            return acc;
        }, query);
    }

    return {query: !!Object.keys(query).length ? query : undefined, modifiers};
};

const applyModifiers = (q, modifiers) => modifiers.reduce((qq, m) => {
    switch (m.type) {
        case 'where':
            return qq.where(m.name);
        case 'index':
            return qq.using(m.name);
        case 'filter':
            return qq.filter(m.attribute);
        case 'and':
            return qq.and();
        case 'or':
            return qq.or();
        case 'not':
            return qq.not();
        case 'null':
            return qq.null();
        case 'defined':
            return qq.not().null();
        case 'ne':
            return qq.not().eq(m.value);
        case 'eq':
            return qq.eq(m.value);
        case 'lt':
            return qq.lt(m.value);
        case 'le':
            return qq.le(m.value);
        case 'gt':
            return qq.gt(m.value);
        case 'ge':
            return qq.ge(m.value);
        case 'beginsWith':
            return qq.beginsWith(m.value);
        case 'between':
            return qq.between((undefined !== m['0']) ? m['0'] : m.lowerBound, (undefined !== m['1']) ? m['1'] : m.upperBound);
        case 'contains':
            return qq.contains(m.value);
        case 'in':
            return qq.in(m.values);
        case 'nin':
            return qq.not().in(m.values);
        default:
            throw new Error(`Unknown query modifier type '${m.type}'`);
    }
}, q);

export const applyQuerySort = (q: {ascending: Function, descending: Function}, direction: any): void => {
    if ('string' === typeof direction) {
        if (('descending' === direction) || ('ascending' === direction)) {
            const sorter = q[<string>direction]?.bind(q);
            if (!sorter) throw new Error(`Sorting is not supported (probably a scan not a query)`);
            sorter();
        } else {
            throw new Error(`Unsupported sort value: ${direction} (allowed: ascending,descending`);
        }
    } else if ('number' === typeof direction) {
        const sorter = q[(direction === -1) ? 'descending' : 'ascending']?.bind(q);
        if (!sorter) throw new Error(`Sorting is not supported (probably a scan not a query)`);
        sorter();
    } else if ('object' === typeof direction) {
        const k = Object.keys(direction).pop();
        if (!k) throw new Error(
            'Unsupported format for sort (allowed: ascending,descending,-1,1 or an object with one attribute with one of these values as value)'
        );
        applyQuerySort(q, direction[k]);
    } else {
        throw new Error('Unsupported format for sort (allowed: ascending,descending,-1,1 or an object with one attribute with one of these values as value)');
    }
};

const defaultKeyBuilder = (v: unknown) => String(v);

function deduplicate<T = unknown>(x: T[], keyBuilder?: (v: T) => string) {
    const b = keyBuilder || defaultKeyBuilder;
    return Object.values(x.reduce((acc, k) => Object.assign(acc, {[b(k)]: k}), {} as Record<string, T>));
}

const runQuery = async (m, {consistent = undefined, index = undefined, hashKey = undefined, rangeKey = undefined, criteria, fields, limit, offset, sort, scan = false, options = {}}) => {
    try {
        const {query, modifiers} = buildQueryDefinitionFromCriteria(index, hashKey, rangeKey, criteria, scan);
        let q = (!scan && query) ? m.query(query) : m.scan();
        if (!q || !q.exec) throw new Error('Unable to build query/scan from definition');
        q = applyModifiers(q, modifiers);
        if (limit) q.limit(limit);
        if (fields && fields.length) q.attributes(deduplicate(fields));
        if (offset) q.startAt(offset);
        if (consistent) q.consistent();
        if (sort) applyQuerySort(q, sort);
        if (options) {
            if (options['consistent']) q.consistent();
            if (options['all'] && q.all) q.all(
                'undefined' !== typeof options['delay'] ? options['delay'] : 100,
                'undefined' !== typeof options['max'] ? options['max'] : 0,
            );
        }
        return await q.exec(); // keep the await to trigger inside the try/catch
    } catch (e: any) {
        throw new Error(`Query error for ${m.name}: ${e.message}`);
    }
};

const convertToQueryDsl = v => {
    if (Array.isArray(v)) {
        return `id:in:${v.join(',')}`;
    }
    let op;
    return Object.entries(v).reduce((acc, [k, vv]) => {
        op = Array.isArray(vv) ? `in:${vv.join(',')}` : `eq:${vv}`;
        acc.push(`${k}:${op}`);
        return acc;
    }, <string[]>[]).join('&');
};

const dynamooseVersions = {
    v1: {
        update: {removeKeyword: '$DELETE', addKeyword: '$ADD', setKeyword: '$PUT'},
    },
    v2: {
        update: {removeKeyword: '$REMOVE', addKeyword: '$ADD', setKeyword: '$SET'},
    },
};

const currentVersion = 'v1'; // @todo be dynamically compatible with both

const dcfg = (op: string, prop: string) => dynamooseVersions[currentVersion][op][prop];

const buildUpdateObject = (data = {}) => {
    const removeKw = dcfg('update', 'removeKeyword');
    const addKw = dcfg('update', 'addKeyword');
    const setKw = dcfg('update', 'setKeyword');
    const x = Object.entries(data).reduce((acc, [k, v]: [string, any]) => {
        switch (k) {
            case '$inc':
                acc = Object.entries(v as any).reduce((acc2, [kk, vv]) => {
                    acc2[addKw][kk] = vv;
                    return acc2;
                }, acc);
                break;
            case '$dec':
                acc = Object.entries(v as any).reduce((acc2, [kk, vv]) => {
                    acc2[addKw][kk] = - (vv as any);
                    return acc2;
                }, acc);
                break;
            case '$unset':
                acc = (v as string[]).reduce((acc2, [kk, vv]) => {
                    acc2[removeKw][kk] = null;
                    return acc2;
                }, acc);
                break;
            case '$set':
                acc = Object.entries(v as any).reduce((acc2, [kk, vv]) => {
                    acc2[setKw][kk] = vv;
                    return acc2;
                }, acc);
                break;
            default:
                if (undefined === v) {
                    acc[removeKw][k] = null;
                } else {
                    if ('string' === typeof v) {
                        if ('**clear**' === v) {
                            acc[removeKw][k] = null;
                        } else if ('**unchanged**' !== v) {
                            // @todo implement detection of increment/add
                            acc[setKw][k] = v;
                        }
                    } else {
                        acc[setKw][k] = v;
                    }
                }
                break;
        }
        return acc;
    }, {
        [setKw]: <any>{},
        [removeKw]: <any>{},
        [addKw]: <any>{},
    });
    if (!Object.keys(x[setKw]).length) delete x[setKw];
    if (!Object.keys(x[removeKw]).length) delete x[removeKw];
    if (!Object.keys(x[addKw]).length) delete x[addKw];
    return x;
}
const buildPage = (r = []) => {
    const cursor = (r && r['lastKey']) ? (new Buffer(JSON.stringify(r['lastKey']))).toString('base64') : undefined;
    return {items: r.map((d: any) => ({...(d || {})})), cursor, count: r['count'] || r.length};
};

const decodePayload = (payload) => {
    payload = {...payload};
    payload.offset && (payload.offset = JSON.parse((new Buffer(payload.offset, 'base64')).toString('ascii')));
    return payload;
}
export default {
    getDb: ({name, schema = {}, schemaOptions = {}, options = {}}) => {
        const model = dynamoose.model(
            name,
            new dynamoose.Schema(schema, schemaOptions),
            {...options, ...globalOptions({name})}
        );
        return {
            find: async (payload) => {
                debugServiceDynamooseFind('payload %j', payload);
                const decodedPayload = {...decodePayload(payload), fields: payload?.selections?.items?.fields || []};
                debugServiceDynamooseFind('decodedPayload %j', decodedPayload);
                const r = buildPage(await runQuery(model, decodedPayload));
                debugServiceDynamooseFind('result %j', r);
                return r;
            },
            get: async (payload) => {
                debugServiceDynamooseGet('payload %j', payload);
                let doc;
                let docs;
                let idValue;
                let consistent = false;
                if ('string' === typeof payload.id) {
                    idValue = payload.id;
                    consistent = Boolean(payload.consistent);
                    doc = await model.get(idValue, ...(consistent ? [{ consistent } as any] : []));
                } else if (Array.isArray(payload.id)) {
                    idValue = payload.id.map(id => ({id}));
                    docs = await model.batchGet(idValue);
                } else if ('object' === typeof payload.id) {
                    idValue = payload.id;
                    [doc = undefined] = (await runQuery(model, {
                        criteria: {_: convertToQueryDsl(idValue)},
                        fields: payload.fields || {},
                        limit: 1,
                        offset: undefined,
                        sort: undefined,
                        scan: false,
                    }) || []).map(d => ({...(d || {})}));
                } else if (('object' === typeof payload) && 0 < Object.keys(payload).length) {
                    const {index = undefined, fields = [], scan = false, ...criteria} = payload;
                    idValue = criteria;
                    [doc = undefined] = (await runQuery(model, {
                        index,
                        criteria,
                        fields,
                        limit: 1,
                        offset: undefined,
                        sort: undefined,
                        scan,
                    }) || []).map(d => ({...(d || {})}));
                }
                let r: any = undefined;
                if (docs) {
                    r = [...docs];
                } else if (!doc) {
                    throw new DocumentNotFoundError(name, idValue);
                } else {
                    r = {...(doc || {})};
                }
                debugServiceDynamooseGet('result %j', r);
                return r;
            },
            delete: async (payload) => {
                debugServiceDynamooseDelete('payload %j', payload);
                let doc;
                let docs;
                if ('string' === typeof payload.id) {
                    doc = {...(await model.delete({id: payload.id}, payload.options) || {})};
                } else if(Array.isArray(payload.id)) {
                    await model.batchDelete(payload.id.map(id => ({id})), payload.options);
                    docs = payload.id.map(id => ({id}));
                } else if ('object' === typeof payload.id) {
                    const toDeleteIds = (await runQuery(model, {
                        criteria: {_: convertToQueryDsl(payload.id)},
                        fields: ['id'],
                        limit: undefined,
                        offset: undefined,
                        sort: undefined,
                        scan: false,
                    }) || []);
                    await model.batchDelete(toDeleteIds.map(doc => ({id: doc.id})), payload.options);
                    docs = toDeleteIds;
                }
                let r: any = undefined;
                if (docs) {
                    r = [...docs];
                } else if (!doc) {
                    throw new DocumentNotFoundError(name, payload.id);
                } else {
                    r = {...(doc || {})};
                }
                debugServiceDynamooseDelete('result %j', r);
                return r;
            },
            create: async (payload) => {
                debugServiceDynamooseCreate('payload %j', payload);
                const r =  {...(await model.create({...(payload.data || {})}, payload.options) || {})};
                debugServiceDynamooseCreate('result %j', r);
                return r;
            },
            update: async (payload) => {
                debugServiceDynamooseUpdate('payload %j', payload);
                let doc: any;
                let docs;
                let ids = [];
                if ('string' === typeof payload.id) {
                    doc = {...(await model.update({id: payload.id}, buildUpdateObject(payload.data), payload.options) as unknown as Promise<any> || {})};
                } else if (Array.isArray(payload.id)) {
                    docs = await Promise.all(payload.id.map(async id => await model.update({id}, buildUpdateObject(payload.data), payload.options) as unknown as Promise<any> || {}));
                } else if ('object' === typeof payload.id) {
                    ids = (await runQuery(model, {
                        criteria: {_: convertToQueryDsl(payload.id)},
                        fields: ['id'],
                        limit: undefined,
                        offset: undefined,
                        sort: undefined,
                        scan: false,
                    }) || []);
                    docs = await Promise.all(ids.map(async doc => await model.update({id: (<any>doc).id}, buildUpdateObject(payload.data), payload.options) as unknown as Promise<any> || {}));
                }
                let r:any = undefined;
                if (docs) {
                    r = [...docs];
                } else if (!doc) {
                    throw new DocumentNotFoundError(name, payload.id);
                } else {
                    r = {...(doc || {})};
                }
                debugServiceDynamooseUpdate('result %j', r);
                return r;
            },
        };
    },
}
