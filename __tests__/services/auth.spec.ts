import auth from '../../src/services/auth';
import bcrypt from 'bcryptjs';
import BadCredentialsError from '../../src/errors/BadCredentialsError';

describe('createAuthToken', () => {
    it('password valid return token and refreshToken', async () => {
        const rawPassword = 'thePasswordHere!';
        const expected = bcrypt.hashSync(rawPassword, 12);
        expect(await auth.createAuthToken({
            user: {username: 'the_username', password: expected},
            password: rawPassword,
        })).toEqual({
            refreshToken: expect.any(String),
            token: expect.any(String),
        });
    });
    it('password invalid throw error', async () => {
        const rawPassword = 'thePasswordHere!';
        const rawPassword2 = 'thePasswordHere!xxxx';
        const expected = bcrypt.hashSync(rawPassword, 12);
        await expect(auth.createAuthToken({
            user: {username: 'the_username', password: expected},
            password: rawPassword2,
        })).rejects.toThrow(new BadCredentialsError('the_username', 'bad password'));
    });
});
describe('refreshAuthToken', () => {
    it('missing refresh token throw error', async () => {
        await expect(auth.refreshAuthToken(<any>{})).rejects.toThrow(new BadCredentialsError(undefined, 'jwt must be provided'));
    });
    it('malformed refresh token throw error', async () => {
        await expect(auth.refreshAuthToken({refreshToken: 'xxx'})).rejects.toThrow(new BadCredentialsError(undefined, 'jwt malformed'));
    });
});