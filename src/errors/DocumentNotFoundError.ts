import AbstractError from './AbstractError';

export default class DocumentNotFoundError extends AbstractError {
    public readonly type: string;
    constructor(type, value, key: string = 'id') {
        value = ('string' === typeof value) ? value : JSON.stringify(value);
        super(`Unknown ${type} ${'id' === key ? '' : `with ${key} is `}'${value}'`, 404, 'document-not-found', {}, {type, [key]: value});
        this.type = type;
        this[key] = value;
    }
}