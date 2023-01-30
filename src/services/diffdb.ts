import dynamodb from './aws/dynamodb';
import {mError} from "../m";

const selectValue = ({s, i, f, b, n, o}) =>
    undefined !== s
        ? String(s)
        : (undefined !== i
            ? parseInt(i) : (undefined !== f
                    ? parseFloat(f) : (undefined !== b
                            ? Boolean(b) : (undefined !== n
                                    ? (Boolean(n) ? null : undefined) : (undefined !== o
                                        ? o.reduce((acc, oo) => Object.assign(acc, {[oo.k]: selectValue(oo)}), {})
                                        : undefined
                                    )
                            )
                    )
            )
        )
;
const changeResult = (change, s, m = undefined) => ({...change, s, ...(m ? {m} : {})});
const changeKey = ({pa}, {pr}) => ({pr, pa: pa || '@'});
const changeData = change => (change.d || []).reduce((acc, {k,...values}) => Object.assign(acc, {[k]: selectValue(<any>values)}), {});

const marshallValueAndCheckChanged = (v, p) => {
    const t = typeof v;
    switch (true) {
        case 'string' === t: return [{s: v}, p.s !== v];
        case 'boolean' === t: return [{b: v}, p.b !== v];
        case null === v: return [{n: true}, !p.n]; // => /!\ typeof null === 'object', known behaviour in JS
        case 'undefined' === t: return [{n: true}, !p.n];
        case 'number' === t: return Number.isInteger(v) ? [{i: v}, p.i !== v] : [{f: v}, p.f !== v];
        case 'object' === t: return Object.entries(v).reduce((acc, [kk, vv]) => {
            const pp = p && p.o && p.o.find(tt => tt.k === kk);
            const zz = marshallValueAndCheckChanged(vv, pp || {});
            acc[0].o.push(zz[0]);
            acc[1] = acc[1] || zz[1];
            return acc;
        }, <any[]>[{o: []}, false]);
        default: return [{s: `${v}`}, true];
    }
};

const getDb = ({name}) => {
    const fetchPaths = async (pr, pa:string|undefined = undefined, throwErrorIfNone = false) => {
        if (!pr) throw new Error('Missing project id');
        const r = await dynamodb.query(name, {pr, ...(!!pa ? {pa: {type: 'beginsWith', value: pa}} : {})});
        if (!r || !r.count || !r.items) {
            if (throwErrorIfNone) throw new Error(`Unknown project '${pr}'`);
            return {count: 0, items: []};
        }
        return r;
    };
    const applyAddChange = async (change, ctx) => applyUpsertChange(change, ctx);

    const applyUpsertChange = async (change, ctx, opts = {}) => {
        const oldO = change.o;
        change.o = 'S';
        if (!!opts['failIfNoChanges'] && (!change.d || 'object' !== typeof change || !Object.keys(change).length)) return changeResult(change, 'E004');
        const r = await dynamodb.upsert(name, changeKey(change, ctx), changeData(change), {values: 'UPDATED_OLD'});
        const attrs = {...((r && r.attributes) || {})};
        const x = (change.d || []).reduce((acc, d) => {
            if (attrs[d.k]) {
                const [vv, changed] = marshallValueAndCheckChanged(attrs[d.k], d);
                if (changed) {
                    acc.push({k: d.k, ...<any>vv});
                    change.o = oldO;
                }
                delete attrs[d.k];
            } else {
                change.o = oldO;
                acc.push({k: d.k, n: true});
            }
            return acc;
        }, []);
        Object.entries(attrs).reduce((acc, [k, v]) => {
            change.o = oldO;
            const [vv] = marshallValueAndCheckChanged(v, {});
            acc.push({k, ...<any>vv});
            return acc;
        }, x);
        !!x.length && (change.x = x);
        return changeResult(change, opts['successCode'] || 'S001');
    };

    const applyMoveChange = async change => {
        return changeResult(change, 'S002');
    };

    const applySkipChange = async change => {
        change.o = 'S';
        return changeResult(change, 'S010');
    };

    const applyRemoveChange = async (change, ctx) => {
        const key = changeKey(change, ctx);
        const items = await Promise.all([
            key,
            ...(await fetchPaths(key.pr, `${key.pa}.`, false)).items.map(item => ({pr: item.pr, pa: item.pa})),
        ].map(async k => dynamodb.delete(name, k, {values: 'ALL_OLD'})));

        change.o = !!items.filter(x => x && x.attributes && x.attributes.pr).length ? 'R' : 'S';
        return changeResult(change, 'S003');
    };

    const applyUpdateChange = async (change, ctx) => applyUpsertChange(change, ctx, {successCode: 'S005', failIfNoChanges: true});

    const applyChange = async (change, ctx) => {
        try {
            change = ('object' === typeof change) ? {...change} : {};
            if (!change.hasOwnProperty('pa')) return changeResult({...change, o: 'S'}, 'E006');
            if (!change.hasOwnProperty('o')) return changeResult({...change, o: 'S'}, 'E007');

            // 'return await' is required below to throw now the error if any

            switch (change.o) {
                case 'A': return await applyAddChange(change, ctx);
                case 'U': return await applyUpdateChange(change, ctx);
                case 'R': return await applyRemoveChange(change, ctx);
                case 'M': return await applyMoveChange(change);
                case 'S': return await applySkipChange(change);
                default: return changeResult({...change, o: 'S'}, 'E008');
            }
        } catch (e: any) {
            await await mError(e, {tags: {mechanism: 'diffdb'}, data: {change}});
            !!process.env.DIFFDB_DEBUG && console.log('diffdb applyChange error E009', e, 'for change:', change);
            return changeResult({...change, o: 'S'}, 'E009', e.message);
        }
    };

    const applySpec = (o, pa, data) => {
        const i = pa.indexOf('.');
        if (-1 === i) return ('' === pa) ? Object.assign(o, data) : Object.assign(o, {[pa]: data});
        const prefix = pa.slice(0, i);
        const suffix = pa.slice(i + 1);
        if (!o[prefix] || !Array.isArray(o[prefix])) o[prefix] = [];
        const ii = suffix.indexOf('.');
        let oo, id;
        if (-1 === ii) {
            id = suffix;
            oo = o[prefix].find(x => x.id === id);
            if (!oo) o[prefix].push(oo = {id});
            Object.assign(oo, data);
        } else {
            id = suffix.slice(0, ii);
            oo = o[prefix].find(x => x.id === id);
            if (!oo) o[prefix].push(oo = {id});
            applySpec(oo, suffix.slice(ii + 1), data);
        }
        return o;
    };

    const recursiveSort = o => {
        Object.values(o).forEach(v => {
            if (!Array.isArray(v)) {
                if ((null !== v) && ('object' === typeof v)) recursiveSort(v);
                return;
            }
            v.sort((a, b) => {
                if (!a.hasOwnProperty('_idx')) return (!b.hasOwnProperty('_idx')) ? 0 : 1;
                if (!b.hasOwnProperty('_idx')) return -1;
                return (a._idx < b._idx) ? -1 : (a._idx === b._idx ? 0 : 1);
            });
            v.forEach(vv => { delete vv['_idx']; });
        });
        return o;
    };

    const merge = (specs, pa = undefined) => {
        let r = recursiveSort(specs.reduce((acc, s) => {
            const {pa, pr, ...data} = s;
            return applySpec(acc, pa === '@' ? '' : pa, data);
        }, {}));
        if (pa) {
            let i;
            const tokens = (<string><any>pa).split(/\./g);
            const l = tokens.length;
            for (i=0; i<l; i++) {
                if (!r[tokens[i]]) return undefined;
                r = r[tokens[i]];
                if (!Array.isArray(r)) return [];
                i++;
                if (i===l) return r;
                r = r.find(x => x.id === tokens[i]);
                if (!r) return undefined;
            }
        }
        return r;
    };

    const applyChangeSet = async query => {
        if (!query.pr) throw new Error('Missing project for change set');
        if (!query.c || !Array.isArray(query.c) || !query.c.length) return {pr: query.pr, c: [], o: 'S'};
        const ctx = {pr: query.pr};
        const c = await Promise.all(query.c.map(async change => applyChange(change, ctx)));
        const o = Object.keys(<any>c.reduce((acc, cc) => {(<any>acc)[(<any>cc).o] = true; return acc;}, {}));
        o.sort();
        return {pr: query.pr, c, o: o.join('') || 'S'};
    };

    const getPath = async (query, opts: {[key: string]: any} = {}) => {
        const pa = query.pa === '@' ? undefined : query.pa;
        return merge((await fetchPaths(query.pr, pa, !!opts.throwErrorIfNone)).items, pa);
    };
    const get = async (query, opts: {[key: string]: any} = {}) => ({pr: query.pr, ...((query.pa && '@' !== query.pa) ? {pa: query.pa} : {}), s: JSON.stringify(await getPath(query, opts))});
    return {applyChangeSet, get, merge, getPath};
};

export default {getDb}