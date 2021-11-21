import AbstractError from './AbstractError';

export default class AuthorizeError extends AbstractError {
    public readonly errors: any[];
    constructor(errors) {
        super(AuthorizeError.buildMessage(errors), 403, 'authorize');
        this.errors = errors;
        this.setErrorInfo(this.getErrorMessages());
        this.setShortMessage('Authorize error');
    }
    getErrors() {
        return this.errors;
    }
    getErrorMessages() {
        return AuthorizeError.buildErrorMessages(this.getErrors());
    }
    static buildErrorMessage(k, v) {
        return `${k}: ${v.message}`;
    }
    static buildErrorMessages(errors) {
        return Object.entries(errors).reduce((m, [k, v]) => {
            m[k] = (<any>v).map(vv => vv.message);
            return m;
        }, {});
    }
    static buildFlatErrorMessages(errors) {
        return Object.entries(errors).reduce((m, [k, v]) =>
            m.concat((<any>v).map(vv => AuthorizeError.buildErrorMessage(k, vv)))
        , []);
    }
    static buildMessage(errors) {
        const n = Object.values(errors).reduce((n, a: any) => n + a.length, 0);
        return `Authorize error (${n})\n\nerrors:\n  - ${AuthorizeError.buildFlatErrorMessages(errors).join("\n  - ")}`;
    }
}