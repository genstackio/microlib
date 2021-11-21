import * as transformers from "../src/transformers";

describe('transformers', () => {
    [
        ['slug', 'Boostez vous maintenanT ', {}, 'boostez-vous-maintenant'],
    ]
        .forEach(
            ([type, value, config, expected]: any) => it(`${type}(${JSON.stringify(value)} + ${JSON.stringify(config)}) => ${JSON.stringify(expected)}`, () => {
                expect(transformers[type](config)(value)).toEqual(expected);
            })
        )
    ;
});