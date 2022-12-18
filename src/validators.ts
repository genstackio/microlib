import {buildAllowedTransitions} from "./utils";
import {mValidatorError} from './m';

export const boolean = () => ({test: v => 'boolean' === typeof v, message: v => `Not a boolean (actual: ${v})`});
export const ipv4 = () => match({pattern: '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$', message: 'Not a valid IP v4 address'});
export const even = () => ({test: v => 0 === (v % 2), message: v => `Even number expected (${v})`});
export const odd = () => ({test: v => 1 === (v % 2), message: v => `Odd number expected (${v})`});
export const min = ({value: x}) => ({test: v => v >= x, message: v => `Min not satisfied (${v} < ${x})`});
export const max = ({value: x}) => ({test: v => v <= x, message: v => `Max not satisfied (${v} > ${x})`});
export const integer = () => ({test: Number.isInteger, message: v => `Must be an integer (actual: ${v})`});
export const positive = () => ({test: v => v >= 0, message: v => `Must be positive (actual: ${v})`});
export const negative = () => ({test: v => v <= 0, message: v => `Must be negative (actual: ${v})`});
export const year = ({min = 1800, max = 2100}) => ({test: v => (v >= min) && (v <= max), message: v => `Year must be >= ${min} and <= ${max} (actual: ${v})`});
export const range = ({min, max}) => ({test: v => (v >= min) && (v <= max), message: v => `Value must be >= ${min} and <= ${max} (actual: ${v})`});
export const minLength = ({min: x}) => ({test: v => v.length >= x, message: v => `Min length not satisfied (${v.length} < ${x})`});
export const maxLength = ({max: x}) => ({test: v => v.length <= x, message: v => `Max length exceeded (${v.length} > ${x})`});
export const values = ({values: x}) => ({test: v => !!x.find(a => a === v), message: v => `Value not allowed (actual: ${v}, allowed: ${x.join(',')})`});
export const transition = ({transitions, property, query}) => {
    const current = ((query && query.oldData) ? query.oldData[property] : undefined);
    const getAllowedTransitions = (next: string|undefined) => buildAllowedTransitions(transitions, current, 'undefined');
    const test = next => {
        const allowedTransitions = getAllowedTransitions(next)
        return (next !== current) && (allowedTransitions.includes(next) || allowedTransitions.includes('*'));
    }
    const message = next => {
        const allowedTransitions = getAllowedTransitions(next);
        if (!current) {
            return `Value '${next}' is not allowed (allowed: ${allowedTransitions.join(', ')})`;
        }
        if (current === next) {
            return `Already in '${current}' step`;
        }
        return `Transition from '${current}' to '${next}' is not allowed (allowed: ${allowedTransitions.join(', ')})`;
    }
    return {test, message};
}
export const currencyCode = () => ({test: v => !!(require('currency-codes').code(v)), message: v => `Unknown currency code '${v}'`});
export const match = ({pattern, flags = undefined, message = undefined}: {pattern: string, flags?: any, message: string|undefined}) => ({test: v => new RegExp(pattern, flags).test(v), message: v => message ? (<any>message).replace('{{v}}', v) : `Malformed (actual: ${v}, expected: ${pattern})`});
export const hasUpperLetter = () => match({pattern: '[A-Z]+', message: 'At least one upper case letter is required'});
export const hasLowerLetter = () => match({pattern: '[a-z]+', message: 'At least one lower case letter is required'});
export const hasDigit = () => match({pattern: '[0-9]+', message: 'At least one digit is required'});
export const hasSpecialChar = () => match({pattern: '[!:$@&%()\\[\\];,/]+', message: 'At least one special character is required'});
export const email = () => match({pattern: '[^@]+@.+\.[^.]+$', message: 'Not a valid email'});
export const uuid = () => match({pattern: '^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$', flags: 'i', message: `Not a valid uuid (actual: {{v}}, expected: v4 format)`});
export const url = () => match({pattern: '^http[s]?://.+$', flags: 'i', message: `Not a valid URL`});
export const arn = () => match({pattern: '^arn:[^:]*:[^:]*:[^:]*:[^:]*:.+$', message: `Not a valid AWS ARN`});
export const unknown = () => ({test: () => false, message: () => `Unknown validator`});
export const isbn = () => ({test: v => !!require('isbn3').parse(v), message: () => 'ISBN is not valid'});
export const visaNumber = () => ({test: v => /^[0-9]+$/.test(v), message: () => 'Visa number is not valid'});
export const jsonString = () => ({check: v => JSON.parse(v)});
export const unique = ({type, hashKey, index, dir}) => ({check: async (v, {id = undefined, idField = 'id'}: {id?: string, idField?: string} = {}) => {
    const caller = require('./services/caller').default;
    const fields = [hashKey || index];
    !fields.includes(idField) && fields.push(idField);
    const r = await caller.execute(`${type}_find`, {index, hashKey: [hashKey || index, v], limit: 1, fields}, `${dir}/services/crud`);
    if (!r || !r.items || !r.items.length) return; // does not exist yet, everything is ok
    const found = r.items[0];
    if (!found) return; // strange
    if (id && (id === found[idField])) return; // exist but object is the same (same id), so this is a silent update, no changes on this field
    throw new Error(`${type} already exist for ${hashKey || index} is equal to ${v}, restricted due to uniqueness constraint`);
}});
export const reference = ({type, localField, idField, targetIdField, fetchedFields = [], dir}) => {
    const caller = require('./services/caller').default;
    const idFields = Array.isArray(idField) ? [...idField] : [idField];
    const fetchReference = async (value) => {
        let r;
        const errors: Error[] = [];
        do {
            const idf = idFields.shift();
            try {
                r = await caller.execute(`${type}_get${(idf !== 'id') ? `By${idf.slice(0, 1).toUpperCase()}${idf.slice(1)}` : ''}`, {
                    [idf]: value,
                    fields: fetchedFields
                }, `${dir}/services/crud`);
            } catch (ee: any) {
                errors.push(ee);
            }
        } while (!r && !!idFields.length);
        if (!r) {
            if (errors.length) throw errors.shift();
            throw new Error(`Unable to fetch reference for ${type}`);
        }
        return r;
    }
    return ({
        test: async (value, localCtx) => {
            if (undefined === value) return true;
            try {
                const k = `${type}.${value}`;
                const existingData = {...(localCtx.data || {}), ...((localCtx.data || {})[k] || {})};
                let requiredData;
                const trackedFields = (fetchedFields && !!fetchedFields.length) ? fetchedFields : ['id'];
                if (!!trackedFields.find(f => !existingData.hasOwnProperty(f) || (undefined === existingData[f]))) {
                    requiredData = await fetchReference(value) || {};
                } else {
                    requiredData = trackedFields.reduce((acc, k) => {
                        acc[k] = existingData[k];
                        return acc;
                    }, <any>{});
                }
                localCtx.data[k] = requiredData;
                return true;
            } catch (e: any) {
                await mValidatorError(e, 'reference', {data: {type, localField, value}});
                return false;
            }
        },
        message: (value) => `Unknown ${type} reference ${value} for ${localField}`,
        postValidate: async (k, value, data, localCtx) => {
            if (targetIdField) {
                data[k] = localCtx.data[`${type}.${value}`][targetIdField];
                localCtx.data[`${type}.${localCtx.data[`${type}.${value}`][targetIdField]}`] = localCtx.data[`${type}.${value}`];
            }
        }
    });
};
export const dynaform = () => ({check: require('@ohoareau/dynaform').validate})
export const dynaformString = () => ({check: v => require('@ohoareau/dynaform').validate(JSON.parse(v))})
