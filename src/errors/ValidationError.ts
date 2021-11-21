import AbstractError from './AbstractError';

export default class ValidationError extends AbstractError {
    public readonly errors: any[];
    constructor(errors) {
        super(ValidationError.buildMessage(errors), 412, 'validation');
        this.errors = errors;
        this.setErrorInfo(this.getErrorMessages());
        this.setShortMessage('Validation error');
    }
    getErrors() {
        return this.errors;
    }
    getErrorMessages() {
        return ValidationError.buildErrorMessages(this.getErrors());
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
            m.concat((<any>v).map(vv => ValidationError.buildErrorMessage(k, vv)))
        , []);
    }
    static buildMessage(errors) {
        const n = Object.values(errors).reduce((n, a: any) => n + a.length, 0);
        return `Validation error (${n})\n\nerrors:\n  - ${ValidationError.buildFlatErrorMessages(errors).join("\n  - ")}`;
    }
}