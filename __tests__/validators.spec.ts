import * as validators from "../src/validators";

describe('validators', () => {
    [
        ['year', 2020, {}, true, ''],
        ['year', 1754, {}, false, 'Year must be >= 1800 and <= 2100 (actual: 1754)'],
        ['min', 10, {value: 10}, true, ''],
        ['max', 10, {value: 10}, true, ''],
        ['max', 11, {value: 10}, false, 'Max not satisfied (11 > 10)'],
    ]
        .forEach(
            ([type, value, config, expected, expectedMessage]: any) => it(`${type}(${JSON.stringify(value)} + ${JSON.stringify(config)}) => ${JSON.stringify(expected)}`, () => {
                const {test, message} = validators[type](config);
                expect(test(value)).toEqual(expected);
                if (!expected) expect(message(value)).toEqual(expectedMessage);
            })
        )
    ;
});