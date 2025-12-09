import {micro} from '../src';

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
