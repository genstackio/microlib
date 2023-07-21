import computeDiffs from "../../src/utils/computeDiffs";

describe('computeDiffs', () => {
    [
        [undefined, undefined, undefined],
        [{}, undefined, undefined],
        [undefined, {}, undefined],
        [{a: 12, b: 'hello'}, undefined, {a: {old: '**unknown**', new: 12}, b: {old: '**unknown**', new: 'hello'}}],
        [{a: 12, b: 'hello'}, {a: 42}, {a: {old: 42, new: 12}, b: {old: '**unknown**', new: 'hello'}}],
    ]
        .forEach(
            ([a, b, expected]) => it(`${JSON.stringify(a)} <> ${JSON.stringify(b)} => ${JSON.stringify(expected)}`, () => {
                expect(computeDiffs(a, b)).toEqual(expected);
            })
        )
    ;
})