import {micro} from '../src';
import cors from '../src/middlewares/cors';
import apigateway from '../src/middlewares/apigateway';

beforeEach(() => {
    jest.resetAllMocks();
});

describe('micro', () => {
    [
        ['basic',
            {number: 12},
            {},
            54,
            q => parseInt(q.number) + 42,
            [],
            [],
        ],
        ['basic 2',
            {number: 13},
            {},
            53,
            q => parseInt(q.number) + 40,
            [],
            [],
        ],
        ['one middleware',
            {number: 13},
            {},
            65,
            q => parseInt(q.number) + 40,
            [
                (req, res, next) => { req.number+= 12; return next(); },
            ],
            [],
        ],
        ['two middlewares',
            {number: 13},
            {},
            51,
            q => parseInt(q.number) + 40, [
                (req, res, next) => { req.number/= 10; return next(); },
                (req, res, next) => { req.number+= 10; return next(); },
            ],
            [],
        ],
        ['two middlewares 2',
            {number: 13},
            {},
            42,
            q => parseInt(q.number) + 40,
            [
                (req, res, next) => { req.number+= 10; return next(); },
                (req, res, next) => { req.number/= 10; return next(); },
            ],
            [],
        ],
    ]
        .forEach(
            ([_, event, context, response, fn, ms, ems]) => it(_ as string, async () => {
                expect(await micro(ms as any[], ems as any[], fn as Function)(event, context)).toEqual(response);
            })
        )
    ;
});

describe('micro + apigateway', () => {
    [
        ['basic',
            {body: '{"number": 12}'},
            {},
            {statusCode: 200, body: "54", headers: {'Content-Type': 'application/json; charset=UTF-8'}},
            q => parseInt(q.data.number) + 42,
            [
                apigateway(),
            ],
            [],
        ],
        ['basic 2',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "53", headers: {'Content-Type': 'application/json; charset=UTF-8'}},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
            ],
            [],
        ],
        ['one middleware',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "65", headers: {'Content-Type': 'application/json; charset=UTF-8'}},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                (req, res, next) => { req.data.number+= 12; return next(); },
            ],
            [],
        ],
        ['two middlewares',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "51", headers: {'Content-Type': 'application/json; charset=UTF-8'}},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                (req, res, next) => { req.data.number/= 10; return next(); },
                (req, res, next) => { req.data.number+= 10; return next(); },
            ],
            [],
        ],
        ['two middlewares 2',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "42", headers: {'Content-Type': 'application/json; charset=UTF-8'}},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                (req, res, next) => { req.data.number+= 10; return next(); },
                (req, res, next) => { req.data.number/= 10; return next(); },
            ],
            [],
        ],
    ]
        .forEach(
            ([_, event, context, response, fn, ms, ems]) => it(_ as string, async () => {
                expect(await micro(ms as any[], ems as any[], fn as Function, {params: true})(event, context)).toEqual(response);
            })
        )
    ;
});

describe('micro + apigateway + cors', () => {
    [
        ['basic',
            {body: '{"number": 12}'},
            {},
            {statusCode: 200, body: "54", headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            }},
            q => parseInt(q.data.number) + 42,
            [
                apigateway(),
                cors(),
            ],
            [],
        ],
        ['basic 2',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "53", headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            }},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                cors(),
            ],
            [],
        ],
        ['one middleware',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "65", headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            }},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                cors(),
                (req, res, next) => { req.data.number+= 12; return next(); },
            ],
            [],
        ],
        ['two middlewares',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "51", headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            }},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                cors(),
                (req, res, next) => { req.data.number/= 10; return next(); },
                (req, res, next) => { req.data.number+= 10; return next(); },
            ],
            [],
        ],
        ['two middlewares 2',
            {body: '{"number": 13}'},
            {},
            {statusCode: 200, body: "42", headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            }},
            q => parseInt(q.data.number) + 40,
            [
                apigateway(),
                cors(),
                (req, res, next) => { req.data.number+= 10; return next(); },
                (req, res, next) => { req.data.number/= 10; return next(); },
            ],
            [],
        ],
        ['basic with origin',
            {body: '{"number": 12}', headers: {'origin': 'https://example.com'}},
            {},
            {statusCode: 200, body: "54", headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Access-Control-Allow-Origin': '*',
                }},
            q => parseInt(q.data.number) + 42,
            [
                apigateway(),
                cors(),
            ],
            [],
        ],
        ['basic with origin and method',
            {httpMethod: 'GET', body: '{"number": 12}', headers: {'origin': 'https://example.com'}},
            {},
            {statusCode: 200, body: "54", headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Access-Control-Allow-Origin': '*',
                }},
            q => parseInt(q.data.number) + 42,
            [
                apigateway(),
                cors(),
            ],
            [],
        ],
        ['basic options request',
            {httpMethod: 'OPTIONS', headers: {
                'origin': 'https://example.com',
                'access-control-request-method': 'POST',
                'access-control-request-headers': 'Content-Type',
            }},
            {},
            {statusCode: 204, body: "{}", headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Content-Length': '0',
                    'Vary': 'Access-Control-Request-Headers',
                }},
            q => parseInt(q.data.number) + 42,
            [
                apigateway(),
                cors(),
            ],
            [],
        ],
    ]
        .forEach(
            ([_, event, context, response, fn, ms, ems]) => it(_ as string, async () => {
                expect(await micro(ms as any[], ems as any[], fn as Function, {params: true})(event, context)).toEqual(response);
            })
        )
    ;
});