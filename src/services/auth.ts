import BadCredentialsError from '@ohoareau/errors/lib/BadCredentialsError';

const jwtTokenDuration = parseInt(process.env.JWT_TOKEN_DURATION || '3600'); // 1h
const jwtRefreshTokenDuration = parseInt(process.env.JWT_REFRESH_TOKEN_DURATION || `${7 * 24 * 3600}`); // 7d
const jwtSecret = String(process.env.JWT_SECRET || 'the-very-secret-secret');
const jwtRefreshSecret = String(process.env.JWT_REFRESH_SECRET || 'the-very-secret-secret-number-2');

const defaultPopulate = ({id, username, email, admin = false}) => ({id, username, email, admin, permissions: [...(admin ? ['admin'] : []), 'user']});

const generateTokensForUser = (data, populate: Function|undefined = undefined) => {
    return generateTokens((populate || defaultPopulate)(data) || {});
};

const generateTokens = (data) => {
    const jwt = require('jsonwebtoken');
    return {
        token: jwt.sign({
            exp: Math.floor(Date.now() / 1000) + jwtTokenDuration,
            ...data,
            scope: (data['permissions'] || []).join(' '),
        }, jwtSecret),
        refreshToken: jwt.sign({
            exp: Math.floor(Date.now() / 1000) + jwtRefreshTokenDuration,
            ...data,
            scope: (data['permissions'] || []).join(' '),
        }, jwtRefreshSecret),
    };
};

const createAuthToken = async ({user, password, populate = undefined}) => {
    if (!user || !password || !user.password) throw new BadCredentialsError((user && user.username) || undefined, 'unknown user');
    if (!await require('bcryptjs').compareSync(password, user.password)) throw new BadCredentialsError(user.username, 'bad password');
    return generateTokensForUser(user, populate);
};

const refreshAuthToken = async ({refreshToken, fetch = undefined, populate = undefined}) => {
    let data, user;
    const jwt = require('jsonwebtoken');
    try {
        data = jwt.verify(refreshToken, jwtRefreshSecret);
        user = fetch ? await (<any>fetch)(data) : data;
    } catch (e: any) {
        throw new BadCredentialsError(undefined, e.message);
    }
    if (!user) throw new BadCredentialsError((data && data.username) || undefined, 'unknown user');
    return generateTokensForUser(user, populate);
};

export default {createAuthToken, refreshAuthToken, generateTokens}