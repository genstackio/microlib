import AbstractError from './AbstractError';

export default class BadCredentialsError extends AbstractError {
    public readonly username: string|undefined;
    constructor(username: string|undefined = undefined, message: string|undefined = undefined) {
        super(
            `Bad credentials${username ? ` for username '${username}'` : ''}${message ? ` (${message})` : ''}`,
            403,
            'bad-credentials',
            {},
            {username}
        );
        this.username = username;
    }
}