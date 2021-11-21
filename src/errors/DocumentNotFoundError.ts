import AbstractError from './AbstractError';

export default class DocumentNotFoundError extends AbstractError {
    public readonly type: string;
    public readonly id: string;
    constructor(type, id) {
        id = ('string' === typeof id) ? id : JSON.stringify(id);
        super(`${type} '${id}' does not exist`, 404, 'document-not-found', {}, {type, id});
        this.type = type;
        this.id = id;
    }
}