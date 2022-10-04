import {replaceVars} from './string';
import evaluate from '../utils/evaluate';

async function build(types, data, def, call, metas = {}, joins = {}) {
    const ctx = {processed: {}, call, ...metas, ...(joins ? {joins} : {})};
    types = {
        unknown: [
            'unknown',
        ],
        ...types,
    };
    data = await apply(types, data, def, false, ctx);
    return apply(types, data, def, true, ctx);
}

async function apply(types, data, def, processParametrized, ctx) {
    return Object.entries(types).reduce(async (acc, [type, items]) => {
        acc = await acc;
        return (items as any[] || []).reduce(async (acc2, k) => {
            acc2 = await acc2;
            if ('join' === type) {
                const [propertyName, typeName, joinFieldName] = k;
                if (ctx.processed[propertyName]) return acc2;
                if (def.hasOwnProperty(propertyName)) {
                    if (isValueParametrized(def[propertyName]) && !processParametrized) return acc2;
                    acc2[propertyName] = await convertValue(await buildValue(def[propertyName], acc2, def, ctx, {action: 'join', propertyName, typeName, joinFieldName}), propertyName, type, ctx);
                }
                ctx.processed[propertyName] = true;
            } else {
                if (ctx.processed[k]) return acc2;
                if (def.hasOwnProperty(k)) {
                    if (isValueParametrized(def[k]) && !processParametrized) return acc2;
                    if (!acc2.hasOwnProperty(k) || (undefined === acc2[k])) {
                        acc2[k] = await convertValue(await buildValue(def[k], acc2, def, ctx), k, type, ctx);
                    } else if (type === 'append') {
                        acc2[k] = [...acc2[k], ...await convertValue(await buildValue(def[k], acc2, def, ctx), k, type, ctx)];
                        acc2[k].sort();
                    }
                }
                ctx.processed[k] = true;
            }
            return acc2;
        }, Promise.resolve(acc));
    }, Promise.resolve(data))
}

async function buildValue(raw, data, def, ctx, options: any = {}) {
    if (isValueParametrized(raw)) {
        raw = await replaceVars(raw, {...def, ...data, joins: ctx.joins || {}});
    }
    switch (options.action) {
        case 'join':
            const doc = await ctx.call(`${options['typeName']}_getBy${(options['joinFieldName'] || '').slice(0, 1).toUpperCase()}${(options['joinFieldName'] || '').slice(1)}`, [{[options['joinFieldName']]: raw}])
            ctx.joins = ctx.joins || {};
            ctx.joins[options['typeName']] = doc;
            raw = doc.id;
            break;
        default:
            break;
    }
    return raw;
}

function isValueParametrized(value) {
    return ('string' === typeof value) && (0 <= value.indexOf('{{'));
}

async function convertValue(raw, name, type, ctx) {
    switch (type) {
        case 'string': return ('string' === typeof raw) ? raw : String(raw);
        case 'int': return ('number' === typeof raw) ? Math.round(raw) : parseInt(raw);
        case 'float': return ('number' === typeof raw) ? raw : parseFloat(raw);
        case 'boolean': return ('boolean' === typeof raw) ? raw : !!raw;
        case 'content': return (('string' === typeof raw) && 'https://' === raw.slice(0, 8)) ? {url: raw} : {content: raw};
        case 'image': return ('object' === typeof raw) ? raw: undefined;
        case 'file': return ('object' === typeof raw) ? raw: undefined;
        case 'timestamp': return ('number' === typeof raw) ? raw: await convertTimestampValue(raw, ctx);
        default: return raw;
    }
}

async function convertTimestampValue(v, {now = undefined} = {}) {
    if ('string' === typeof v) {
        if ('$' === v.slice(0, 1)) {
            v = Object.entries({
                years: ` * ${365 * 24 * 60 * 60 * 1000}`,
                year: ` * ${365 * 24 * 60 * 60 * 1000}`,
                trimesters: ` * ${3 * 31 * 24 * 60 * 60 * 1000}`,
                trimester: ` * ${3 * 31 * 24 * 60 * 60 * 1000}`,
                months: ` * ${31 * 24 * 60 * 60 * 1000}`,
                month:  ` * ${31 * 24 * 60 * 60 * 1000}`,
                weeks: ` * ${7 * 24 * 60 * 60 * 1000}`,
                week:  ` * ${7 * 24 * 60 * 60 * 1000}`,
                days: ` * ${24 * 60 * 60 * 1000}`,
                day:  ` * ${24 * 60 * 60 * 1000}`,
                hours: ` * ${60 * 60 * 1000}`,
                hour:  ` * ${60 * 60 * 1000}`,
                minutes: ` * ${60 * 1000}`,
                minute:  ` * ${60 * 1000}`,
                seconds: ` * ${1000}`,
                second:  ` * ${1000}`,
            }).reduce((acc, [k, v]) => acc.replace(k, v), v.slice(1));
            v = await evaluate(v, {now: now || new Date().getTime()})
        } else {
            const v2 = Date.parse(v);
            if (!!v2 && (0 <= v2)) {
                v = v2;
            }
        }
    }
    if ('number' !== typeof v) v = parseInt(v) || undefined;
    return v;
}

// noinspection JSUnusedGlobalSymbols
export default {
    build,
}