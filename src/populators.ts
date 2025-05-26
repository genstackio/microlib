import {replaceVars} from "./utils";

const chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const fingerprint = ({fields = [], algorithm = undefined, separator = '|'}: {fields: string[], algorithm?: string|undefined, separator?: string}) => query =>
    require('./services/crypto').default.hash(fields.map(k => (query.data || {})[k] || query[k]).join(separator), algorithm)
;
export const user_id = () => ({user}: any = {}) => (user && user.id) ? user.id : undefined;
export const token = ({size = 16}) => () => require('rand-token').uid(size);
export const uuid = () => () => require('uuid').v4();
export const now = () => () => new Date().valueOf();
export const ref_attribute_field = def => ({data, contextData}) => {
    if (!data) return '**unchanged**';
    const sources = def.sources ? def.sources : [def];
    const source = sources.find(s => (s.key in data) && (undefined !== data[s.key]));
    if (!source) return '**unchanged**';
    const {key, prefix, sourceField} = source;
    if (('**clear**' === data[key]) || (undefined === data[key])) {
        return '**clear**';
    }
    if (!data[key]) return '**unchanged**';
    if (Array.isArray(sourceField)) {
        const xxx = sourceField.map(sf => (contextData[`${prefix}.${data[key]}`] || {})[sf] || undefined).filter(x => !!x);
        if (!xxx.length) {
            return undefined;
        }
        return xxx.join(' ');
    }
    return (contextData[`${prefix}.${data[key]}`] || {})[sourceField] || undefined;
};
export const empty = () => () => undefined;
export const value = ({value}) => ({data}) => ('string' === typeof value) ? replaceVars(value, data) : value;
export const ccdd = () => () => {
    const t: (string|number)[] = [];
    t.push(chars[Math.floor(Math.random() * chars.length)]);
    t.push(chars[Math.floor(Math.random() * chars.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};
export const cccddd = () => () => {
    const t: (string|number)[] = [];
    t.push(chars[Math.floor(Math.random() * chars.length)]);
    t.push(chars[Math.floor(Math.random() * chars.length)]);
    t.push(chars[Math.floor(Math.random() * chars.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};
export const dddd = () => () => {
    const t: (number)[] = [];
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};
export const ddddd = () => () => {
    const t: (number)[] = [];
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};
export const dddddd = () => () => {
    const t: (number)[] = [];
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};
export const dddddddd = () => () => {
    const t: (number)[] = [];
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    t.push(digits[Math.floor(Math.random() * digits.length)]);
    return t.join('');
};

export const period_date = config => {
    const {
        weekStartDate, weekEndDate, yearStartDate, yearEndDate, monthStartDate, monthEndDate, dayStartDate, dayEndDate,
        hourStartDate, hourEndDate, quarterStartDate, quarterEndDate, biweekStartDate, biweekEndDate,
        semesterStartDate, semesterEndDate, hourQuarterStartDate, hourQuarterEndDate,
        buildDate,
    } = require('./services/period');

    const factories = {
        WEEK: [weekStartDate, weekEndDate],
        YEAR: [yearStartDate, yearEndDate],
        MONTH: [monthStartDate, monthEndDate],
        DAY: [dayStartDate, dayEndDate],
        HOUR: [hourStartDate, hourEndDate],
        QUARTER: [quarterStartDate, quarterEndDate],
        BIWEEK: [biweekStartDate, biweekEndDate],
        SEMESTER: [semesterStartDate, semesterEndDate],
        HOUR_QUARTER: [hourQuarterStartDate, hourQuarterEndDate],
    }

    return query => {
        const mode = (config || {}).mode;
        const type = ((query || {}).data || {}).type;

        const factory = (factories[type] || [undefined, undefined])['end' === mode ? 1 : 0];

        if (!factory) throw new Error(`Unsupported period ${mode} date type '${type}'`);

        const date = factory(buildDate((query || {}).data));

        return (!date || !date.getTime) ? undefined : date.getTime();
    };
}
