import AbstractError from './AbstractError';

export default class ResourceNotFoundError extends AbstractError {
    constructor() {
        super('Resource Not Found', 404, 'not-found');
    }
}