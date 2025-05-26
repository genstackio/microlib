import populate from '../../src/hooks/populate';

describe('populate', () => {
    [
        ['empty return empty',
            {},
            {},
            { autoPopulated: {} },
        ],
        ['non empty but no values return same',
            {},
            { data: { a: 42 } },
            { data: { a: 42 }, autoPopulated: {} },
        ],
        ['non empty with values but on property that have a value return provided value',
            { values: { b: {type: '@value', config: {value: "World"}} }},
            { data: { a: 42, b: "Hello" } },
            { data: { a: 42, b: "World" }, autoPopulated: { b: true} },
        ],
        ['non empty with values and property that have no value return value for that property',
            { values: { b: {type: '@value', config: {value: "World"}} }},
            { data: { a: 42, c: "Hello" } },
            { data: { a: 42, b: "World", c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with integer value and property that have no value return value for that property',
            { values: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, c: "Hello" } },
            { data: { a: 42, b: 43, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with integer value and property that have value return value for that property',
            { values: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, b: 41, c: "Hello" } },
            { data: { a: 42, b: 43, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with integer value and property that have value return value for that property',
            { values: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, b: 0, c: "Hello" } },
            { data: { a: 42, b: 43, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with boolean value and property that have value return value for that property',
            { values: { b: {type: '@value', config: {value: false}} }},
            { data: { a: 42, b: true, c: "Hello" } },
            { data: { a: 42, b: false, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with boolean value and property that have value return value for that property',
            { values: { b: {type: '@value', config: {value: true}} }},
            { data: { a: 42, b: false, c: "Hello" } },
            { data: { a: 42, b: true, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['multi-passes values',
            { values: { b: {type: '@value', config: {valuesPass: 2, value: '{{z}}'}}, z: {type: '@value', config: {value: 12}} }},
            { data: { a: 42, b: false, c: "Hello" } },
            { data: { a: 42, b: "12", c: "Hello", z: 12 }, autoPopulated: { b: true, z: true } },
        ],
    ]
        .forEach(
            ([name, model, data, expected]: any) => it(name, async () => {
                expect(await populate({model, dir: undefined})(data)).toEqual(expected);
            }
        ))
    ;
});
