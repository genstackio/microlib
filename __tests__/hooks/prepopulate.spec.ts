import prepopulate from '../../src/hooks/prepopulate';

describe('prepopulate', () => {
    [
        ['empty return empty',
            {},
            {},
            { autoPopulated: {} },
        ],
        ['non empty but no default values return same',
            {},
            { data: { a: 42 } },
            { data: { a: 42 }, autoPopulated: {} },
        ],
        ['non empty with default values but on property that have a value return provided value not default value',
            { defaultValues: { b: {type: '@value', config: {value: "World"}} }},
            { data: { a: 42, b: "Hello" } },
            { data: { a: 42, b: "Hello" }, autoPopulated: {} },
        ],
        ['non empty with default values and property that have no value return default value for that property',
            { defaultValues: { b: {type: '@value', config: {value: "World"}} }},
            { data: { a: 42, c: "Hello" } },
            { data: { a: 42, b: "World", c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with integer default value and property that have no value return default value for that property',
            { defaultValues: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, c: "Hello" } },
            { data: { a: 42, b: 43, c: "Hello" }, autoPopulated: { b: true } },
        ],
        ['non empty with integer default value and property that have value return value for that property and no default value',
            { defaultValues: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, b: 41, c: "Hello" } },
            { data: { a: 42, b: 41, c: "Hello" }, autoPopulated: {} },
        ],
        ['non empty with integer default value and property that have value return value for that property and no default value even if value is zero',
            { defaultValues: { b: {type: '@value', config: {value: 43}} }},
            { data: { a: 42, b: 0, c: "Hello" } },
            { data: { a: 42, b: 0, c: "Hello" }, autoPopulated: {} },
        ],
        ['non empty with boolean default value and property that have value return value for that property and no default value',
            { defaultValues: { b: {type: '@value', config: {value: false}} }},
            { data: { a: 42, b: true, c: "Hello" } },
            { data: { a: 42, b: true, c: "Hello" }, autoPopulated: {} },
        ],
        ['non empty with boolean default value and property that have value return value for that property and no default value even if value is false',
            { defaultValues: { b: {type: '@value', config: {value: true}} }},
            { data: { a: 42, b: false, c: "Hello" } },
            { data: { a: 42, b: false, c: "Hello" }, autoPopulated: {} },
        ],
    ]
        .forEach(
            ([name, model, data, expected]: any) => it(name, async () => {
                expect(await prepopulate({model, dir: undefined})(data)).toEqual(expected);
            }
        ))
    ;
});
