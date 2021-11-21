import AbstractError from './AbstractError';

export default class UnauthorizedError extends AbstractError {
    constructor() {
        super(`Unauthorized`, 401, 'unauthorized');
    }
}