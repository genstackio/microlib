import ValidationError from '@ohoareau/errors/lib/ValidationError';

const getValidator = (type, dir) => {
    let v;
    if ('@' === type.substr(0, 1)) {
        v = require('../validators');
        type = type.substr(1);
    } else {
        v = require(`${dir}/validators`);
    }
    return v[type] || v.unknown;
};

export default ({model: {fields = {}, privateFields = {}, requiredFields = {}, onceFields = {}, validators = {}}, create = true, dir}) => async data => {
    const required = create;
    if (!data.data) data.data = {};
    if ('function' !== typeof data.data.hasOwnProperty) data.data = {...data.data};
    const localCtx = {data: data.contextData || {}};
    !create && (localCtx['id'] = data.id);
    const errors = {};
    Object.keys(data.data).forEach(k => {
        if (!fields[k] || privateFields[k]) {
            if (!data.autoPopulated || !data.autoPopulated[k]) {
                delete data.data[k];
            }
        }
    });
    // this first test is enabled only for create operations
    required && Object.keys(requiredFields).forEach(k => {
        if (!data.data.hasOwnProperty(k)) {
            if (!errors[k]) errors[k] = [];
            errors[k].push(new Error('Field is required'));
        }
    });
    // this second test is always enabled and check if the field has an empty value and is required
    Object.keys(requiredFields).forEach(k => {
        if (data.data.hasOwnProperty(k) && ((undefined === data.data[k]) || (null === data.data[k]) || ('**clear**' === data.data[k]))) {
            if (!errors[k]) errors[k] = [];
            errors[k].push(new Error('Field is required'));
        }
    });
    // this third test is enabled only for update operations
    !create && Object.keys(onceFields).forEach(k => {
        if (data.data.hasOwnProperty(k) && (data.oldData && data.oldData.hasOwnProperty(k))) {
            if (!errors[k]) errors[k] = [];
            errors[k].push(new Error('Field is not updatable when a value has already been set'));
        }
    });
    await Promise.all(Object.entries(data.data).map(async ([k, v]) => {
        if (!validators[k]) return;
        if ((undefined === v) || (null === v) || ('**clear**' === v) || ('**unchanged**' === v)) return; // value is empty no need to validate with special validators
        await Promise.all(validators[k].map(async ({type, config = {}}) => {
            const validator: {test?: Function, message?: Function, check?: Function, postValidate?: Function} = getValidator(type, dir)({...config, query: data, property: k, dir});
            let isInError = false;
            if (validator.test) {
                if (!(await validator.test(v, localCtx))) {
                    if (!errors[k]) errors[k] = [];
                    errors[k].push(new Error((validator.message && (await validator.message(v, localCtx))) || 'Validation error'));
                    isInError = true;
                }
            }
            if (validator.check) {
                try {
                    await validator.check(v, localCtx);
                } catch (e: any) {
                    if (!errors[k]) errors[k] = [];
                    if (e) {
                        if (e.getErrors) {
                            e.getErrors().forEach(ee => errors[k].push(ee));
                        } else {
                            errors[k].push(new Error(e.message || 'Validation error'));
                        }
                    } else {
                        errors[k].push(new Error('Validation error'));
                    }
                    isInError = true;
                }
            }
            if (!isInError && validator.postValidate) {
                try {
                    await validator.postValidate(k, v, data.data, localCtx, data);
                } catch (e: any) {
                    if (!errors[k]) errors[k] = [];
                    if (e) {
                        if (e.getErrors) {
                            e.getErrors().forEach(ee => errors[k].push(ee));
                        } else {
                            errors[k].push(new Error(e.message || 'Post Validation error'));
                        }
                    } else {
                        errors[k].push(new Error('Post Validation error'));
                    }
                }
            }
        }));
    }));
    if (0 < Object.keys(errors).length) throw new ValidationError(errors);
    data.contextData = Object.assign(data.contextData || {}, localCtx.data || {});
    return data;
}