jest.mock('../../src/services/aws/dynamodb');
import dynamodbMock from '../../src/services/aws/dynamodb';
const {applyChangeSet, merge, get, getPath} = require('../../src/services/diffdb').default.getDb({name: 'table_name'});

beforeEach(() => {
    jest.resetAllMocks();
});

describe('applyChangeSet', () => {
    [
        ['no project specified throw error', {}],
        ['not valid project id specified throw error (boolean)', {pr: false}],
        ['not valid project id specified throw error (empty string)', {pr: ''}],
        ['not valid project id specified throw error (integer)', {pr: 0}],
    ]
        .forEach(
            ([name, query]) => it(<string>name, async () => {
                await expect(applyChangeSet(query)).rejects.toThrow('Missing project for change set');
            })
        )
    ;
    [
        ['no changes attribute do nothing',
            {pr: 'p1'},
            {pr: 'p1', c: [], o: 'S'},
        ],
        ['changes attribute is not an array do nothing',
            {pr: 'p1', c: false},
            {pr: 'p1', c: [], o: 'S'},
        ],
        ['no changes do nothing',
            {pr: 'p1', c: []},
            {pr: 'p1', c: [], o: 'S'},
        ],
        ['badly formatted change (not an object) do nothing',
            {pr: 'p1', c: ['not an object']},
            {pr: 'p1', c: [{o: 'S', s: 'E006'}], o: 'S'},
        ],
        ['change with no path return error status',
            {pr: 'p1', c: [{}]},
            {pr: 'p1', c: [{o: 'S', s: 'E006'}], o: 'S'},
        ],
        ['change with path but no operation return error',
            {pr: 'p1', c: [{pa: 'x'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'S', s: 'E007'}], o: 'S'},
        ],
        ['change with path and unknown operation return error',
            {pr: 'p1', c: [{pa: 'x', o: 'unknown'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'S', s: 'E008'}], o: 'S'},
        ],
        ['change with path and add operation but no data return success',
            {pr: 'p1', c: [{pa: 'x', o: 'A'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'S', s: 'S001'}], o: 'S'},
        ],
        ['change with path and add operation but error throw by underlying service return error',
            {pr: 'p1', c: [{pa: 'x', o: 'A'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'S', s: 'E009', m: 'some error'}], o: 'S'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'x'}, {}, {values: 'UPDATED_OLD'}], new Error('some error')],
            ]}
        ],
        ['change with empty path and add operation but no data return success',
            {pr: 'p1', c: [{pa: '', o: 'A'}]},
            {pr: 'p1', c: [{pa: '', o: 'S', s: 'S001'}], o: 'S'},
        ],
        ['change with empty path and add operation stores as @ and return success',
            {pr: 'p1', c: [{pa: '', o: 'A', d: [{k: 'x', s: 'hello'}]}]},
            {pr: 'p1', c: [{pa: '', o: 'A', d: [{k: 'x', s: 'hello'}], x: [{k: 'x', n: true}], s: 'S001'}], o: 'A'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: '@'}, {x: 'hello'}, {values: 'UPDATED_OLD'}], undefined],
            ]}
        ],
        ['change and add operation stores and return success',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', s: 'hello'}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', s: 'hello'}], x: [{k: 'x', n: true}], s: 'S001'}], o: 'A'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'xs.y'}, {x: 'hello'}, {values: 'UPDATED_OLD'}], {attributes: {}}],
            ]}
        ],
        ['change and add operation stores and return success even with value is a object',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', o: [{k: 'z', s: 'hello'}]}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', o: [{k: 'z', s: 'hello'}]}], x: [{k: 'x', n: true}], s: 'S001'}], o: 'A'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'xs.y'}, {x: {z: 'hello'}}, {values: 'UPDATED_OLD'}], {attributes: {}}],
            ]}
        ],
        ['change and add operation stores and return success even with value is a deep object',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', o: [{k: 'z', o: [{k: 't', s: 'hello'}]}]}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', o: [{k: 'z', o: [{k: 't', s: 'hello'}]}]}], x: [{k: 'x', n: true}], s: 'S001'}], o: 'A'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'xs.y'}, {x: {z: {t: 'hello'}}}, {values: 'UPDATED_OLD'}], {attributes: {}}],
            ]}
        ],
        ['change and skip operation do nothing and return success',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'S', d: [{k: 'x', s: 'hello'}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'S', d: [{k: 'x', s: 'hello'}], s: 'S010'}], o: 'S'},
        ],
        ['change and update operation stores and return success with old values',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', s: 'bye'}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', s: 'bye'}], x: [{k: 'x', s: 'hello'}], s: 'S001'}], o: 'A'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'xs.y'}, {x: 'bye'}, {values: 'UPDATED_OLD'}], {attributes: {x: 'hello'}}],
            ]}
        ],
        ['change and update operation stores and return success with no old values if new and old values where the same',
            {pr: 'p1', c: [{pa: 'xs.y', o: 'A', d: [{k: 'x', s: 'hello'}]}]},
            {pr: 'p1', c: [{pa: 'xs.y', o: 'S', d: [{k: 'x', s: 'hello'}], s: 'S001'}], o: 'S'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'xs.y'}, {x: 'hello'}, {values: 'UPDATED_OLD'}], {attributes: {x: 'hello'}}],
            ]}
        ],
        ['change with path and remove operation return success',
            {pr: 'p1', c: [{pa: 'x', o: 'R'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'R', s: 'S003'}], o: 'R'},
            {
                query: [
                    [['table_name', {pr: 'p1', pa: {type: 'beginsWith', value: 'x.'}}], {items: [], count: 0, scannedCount: 0}],
                ],
                delete: [
                    [['table_name', {pr: 'p1', pa: 'x'}, {values: 'ALL_OLD'}], {attributes: {pr: 'p1'}}],
            ]},
        ],
        ['change with path and move operation return success',
            {pr: 'p1', c: [{pa: 'x', o: 'M'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'M', s: 'S002'}], o: 'M'},
        ],
        ['change with path and update operation but no data return skipped',
            {pr: 'p1', c: [{pa: 'x', o: 'U'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'S', s: 'E004'}], o: 'S'},
        ],
        ['change with path and update operation with data return success',
            {pr: 'p1', c: [{pa: 'x', d: [{k: 'key1', s: 'value 1'}], o: 'U'}]},
            {pr: 'p1', c: [{pa: 'x', o: 'U', d: [{k: 'key1', s: 'value 1'}], x: [{k: 'key1', n: true}], s: 'S005'}], o: 'U'},
            {
                upsert: [
                    [['table_name', {pr: 'p1', pa: 'x'}, {key1: 'value 1'}, {values: 'UPDATED_OLD'}], undefined],
                ],
            }
        ],
        ['multiple valid changes return success',
            {pr: 'p1', c: [
                {pa: 'x', d: [{k: 'key1', s: 'value 1'}], o: 'U'},
                {pa: 'y', d: [{k: 'key2', s: 'value 2'}], o: 'U'},
                {pa: 'subLists.a', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], o: 'U'},
            ]},
            {pr: 'p1', c: [
                {pa: 'x', o: 'U', d: [{k: 'key1', s: 'value 1'}], x: [{k: 'key1', n: true}], s: 'S005'},
                {pa: 'y', o: 'U', d: [{k: 'key2', s: 'value 2'}], x: [{k: 'key2', n: true}], s: 'S005'},
                {pa: 'subLists.a', o: 'U', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], x: [{k: 'key3', n: true}, {k: 'key5', n: true}], s: 'S005'},
            ], o: 'U'},
            {upsert: [
                [['table_name', {pr: 'p1', pa: 'x'}, {key1: 'value 1'}, {values: 'UPDATED_OLD'}], undefined],
                [['table_name', {pr: 'p1', pa: 'y'}, {key2: 'value 2'}, {values: 'UPDATED_OLD'}], undefined],
                [['table_name', {pr: 'p1', pa: 'subLists.a'}, {key3: 'value 4', key5: 12}, {values: 'UPDATED_OLD'}], undefined],
            ]}
        ],
        ['multiple changes with error changes return various statuses',
            {pr: 'p1', c: [
                {d: [{k: 'key1', s: 'value 1'}], o: 'U'},
                {pa: 'y', d: [{k: 'key2', s: 'value 2'}], o: 'U'},
                {pa: 'a', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], o: 'U'},
                {pa: 'subLists.a', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], o: 'unknown'},
            ]},
            {pr: 'p1', c: [
                {d: [{k: 'key1', s: 'value 1'}], o: 'S', s: 'E006'},
                {pa: 'y', d: [{k: 'key2', s: 'value 2'}], x: [{k: 'key2', n: true}], o: 'U', s: 'S005'},
                {pa: 'a', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], x: [{k: 'key3', n: true}, {k: 'key5', n: true}], o: 'U', s: 'S005'},
                {pa: 'subLists.a', d: [{k: 'key3', s: 'value 4'}, {k: 'key5', i: 12}], o: 'S', s: 'E008'},
            ], o: 'SU'},
        ],
        ['remove change will remove all the branch with same path-prefix',
            {pr: 'p1', c: [{pa: 'y', o: 'R'}]},
            {pr: 'p1', c: [{pa: 'y', o: 'R', s: 'S003'}], o: 'R'},
            {
                query: [
                    [['table_name', {pr: 'p1', pa: {type: 'beginsWith', value: 'y.'}}], {items: [{pr: 'p1', pa: 'y.z.t'}], count: 1, scannedCount: 1}],
                ],
                delete: [
                    [['table_name', {pr: 'p1', pa: 'y'}, {values: 'ALL_OLD'}], {attributes: {pr: 'p1'}}],
                    [['table_name', {pr: 'p1', pa: 'y.z.t'}, {values: 'ALL_OLD'}], {attributes: {pr: 'p1'}}],
                ],
            }
        ],
        ['remove change will do nothing and return success if nothing deleted (already removed)',
            {pr: 'p1', c: [{pa: 'y', o: 'R'}]},
            {pr: 'p1', c: [{pa: 'y', o: 'S', s: 'S003'}], o: 'S'},
            {
                query: [
                    [['table_name', {pr: 'p1', pa: {type: 'beginsWith', value: 'y.'}}], {items: [], count: 0, scannedCount: 1}],
                ],
                delete: [
                    [['table_name', {pr: 'p1', pa: 'y'}, {values: 'ALL_OLD'}], {attributes: undefined}],
                ],
            }
        ],
    ].forEach(
        ([name, query, expected, mockCalls = {}]: any) => it(name, async () => {
            mockCalls.query && mockCalls.query.forEach(([, exp]) => (<any>dynamodbMock.query).mockResolvedValueOnce(exp));
            mockCalls.upsert && mockCalls.upsert.forEach(([, exp]) => (exp instanceof Error) ? (<any>dynamodbMock.upsert).mockImplementationOnce(() => { throw exp; }) : (<any>dynamodbMock.upsert).mockResolvedValueOnce(exp));
            mockCalls.delete && mockCalls.delete.forEach(([, exp]) => (<any>dynamodbMock.delete).mockResolvedValueOnce(exp));
            expect(await applyChangeSet(query)).toEqual(expected);
            mockCalls.query && mockCalls.query.forEach(([m]) => expect(dynamodbMock.query).toHaveBeenCalledWith(...m));
            mockCalls.upsert && mockCalls.upsert.forEach(([m]) => expect(dynamodbMock.upsert).toHaveBeenCalledWith(...m));
            mockCalls.delete && mockCalls.delete.forEach(([m]) => expect(dynamodbMock.delete).toHaveBeenCalledWith(...m));
        })
    );
});
describe('merge', () => {
    [
        ['no specs',
            [],
            {},
        ],
        ['one specs at root level',
            [
                {pa: '@', a: 1, b: 'two'}
            ],
            {a: 1, b: 'two'},
        ],
        ['multiple specs at different levels',
            [
                {pa: '@', a: 1, b: 'three'},
                {pa: 'x.y', c: true, d: 'hello'},
            ],
            {a: 1, b: 'three', x: [{id: 'y', c: true, d: 'hello'}]},
        ],
        ['multiple specs at different and same levels',
            [
                {pa: '@', a: 1, b: 'three'},
                {pa: 'x.y', c: true, d: 'hello'},
                {pa: 'x.z', c: false, d: 'world', e: 0.123},
                {pa: 'x.z.t.u', t: ['a', 'b']},
            ],
            {
                a: 1, b: 'three', x: [
                    {id: 'y', c: true, d: 'hello'},
                    {id: 'z', c: false, d: 'world', e: 0.123, t: [{id: 'u', t: ['a', 'b']}]},
                ]
            },
        ],
        ['multiple specs at different and same levels and in bad order',
            [
                {pa: 'x.z.t.u', t: ['a', 'b']},
                {pa: 'x.y', c: true, d: 'hello'},
                {pa: 'x.z', c: false, d: 'world', e: 0.123},
                {pa: '@', a: 1, b: 'three'},
            ],
            {
                a: 1, b: 'three', x: [
                    {id: 'z', c: false, d: 'world', e: 0.123, t: [{id: 'u', t: ['a', 'b']}]},
                    {id: 'y', c: true, d: 'hello'},
                ]
            },
        ],
        ['multiple specs at different and same levels and in bad order but with indexes should be sorted',
            [
                {pa: 'x.z.t.u', t: ['a', 'b']},
                {pa: 'x.y', _idx: 0, c: true, d: 'hello2'},
                {pa: 'x.z', _idx: 1, c: false, d: 'world2', e: 0.123},
                {pa: '@', a: 1, b: 'three'},
            ],
            {
                a: 1, b: 'three', x: [
                    {id: 'y', c: true, d: 'hello2'},
                    {id: 'z', c: false, d: 'world2', e: 0.123, t: [{id: 'u', t: ['a', 'b']}]},
                ]
            },
        ],
    ]
        .forEach(
            ([name, items, expected]) => it(<string>name, () => {
                expect(merge(items)).toEqual(expected);
            })
        )
    ;
});
describe('get', () => {
    it('no project specified throw error', async () => {
        await expect(get({})).rejects.toThrow('Missing project id');
    });
    it('unknown project throw error if throwErrorIfNone enabled', async () => {
        (<any>dynamodbMock.queryIndex).mockResolvedValue({items: [], count: 0, scannedCount: 0});
        await expect(get({pr: 'unknown'}, {throwErrorIfNone: true})).rejects.toThrow("Unknown project 'unknown'");
    });
    it('existing project return json-stringified specifications', async () => {
        (<any>dynamodbMock.query).mockResolvedValue({items: [
            {pr: 'p1', pa: '@', a: 1, b: 'hello', c: true},
            {pr: 'p1', pa: 'd.xxx1', _idx: 0, e: 'f'},
            {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
            {pr: 'p1', pa: 'd.xxx2', _idx: 1, e: 'h'},
            {pr: 'p1', pa: 'd.xxx4', _idx: 3, kkk: {a0: 1, b0: 'two', c0: true}},
        ], count: 5, scannedCount: 20});
        expect(await get({pr: 'p1'})).toEqual({
            pr: 'p1',
            s: JSON.stringify({
                a: 1,
                b: 'hello',
                c: true,
                d: [
                    {id: 'xxx1', e: 'f'},
                    {id: 'xxx2', e: 'h'},
                    {id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']},
                    {id: 'xxx4', kkk: {a0: 1, b0: 'two', c0: true}},
                ]
            })
        })
    });
    it('existing project return json-stringified specifications of specified sub path', async () => {
        (<any>dynamodbMock.query).mockResolvedValue({items: [
            {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
        ], count: 1, scannedCount: 20});
        expect(await get({pr: 'p1', pa: 'd.xxx3'})).toEqual({
            pr: 'p1',
            pa: 'd.xxx3',
            s: JSON.stringify({id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']})
        });
    });
    it('existing project return json-stringified specifications of specified sub path (pa = @)', async () => {
        (<any>dynamodbMock.query).mockResolvedValue({items: [
            {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
        ], count: 1, scannedCount: 20});
        expect(await get({pr: 'p1', pa: '@'})).toEqual({
            pr: 'p1',
            s: JSON.stringify({d: [{id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']}]})
        });
    });
    it('existing project return json-stringified specifications of specified sub path (pa is empty string)', async () => {
        (<any>dynamodbMock.query).mockResolvedValue({items: [
            {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
        ], count: 1, scannedCount: 20});
        expect(await get({pr: 'p1', pa: ''})).toEqual({
            pr: 'p1',
            s: JSON.stringify({d: [{id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']}]})
        });
    });
});
describe('getPath', () => {
    it('no project throw error', async () => {
        await expect(getPath({})).rejects.toThrow('Missing project id');
    });
    it('unknown project throw error if throwErrorIfNone enabled', async () => {
        (<any>dynamodbMock.queryIndex).mockResolvedValue({items: [], count: 0, scannedCount: 0});
        await expect(getPath({pr: 'unknown'}, {throwErrorIfNone: true})).rejects.toThrow("Unknown project 'unknown'");
    });
    it('unknown project return empty', async () => {
        (<any>dynamodbMock.query).mockResolvedValueOnce({items: [], count: 0, scannedCount: 0});
        expect(await getPath({pr: 'unknown'})).toEqual({});
    });
    it('existing project and items for sub list path return specifications', async () => {
        (<any>dynamodbMock.query).mockResolvedValueOnce({items: [
            {pr: 'p1', pa: 'd.xxx1', _idx: 0, e: 'f'},
            {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
            {pr: 'p1', pa: 'd.xxx2', _idx: 1, e: 'h'},
        ], count: 3, scannedCount: 20});
        expect(await getPath({pr: 'p1', pa: 'd'})).toEqual([{id: 'xxx1', e: 'f'}, {id: 'xxx2', e: 'h'}, {id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']}]);
    });
    it('existing project and items for sub list item path return specifications', async () => {
        (<any>dynamodbMock.query).mockResolvedValueOnce({items: [
            {pr: 'p1', pa: 'd.xxx1', _idx: 0, e: 'f'},
        ], count: 1, scannedCount: 20});
        expect(await getPath({pr: 'p1', pa: 'd.xxx1'})).toEqual({id: 'xxx1', e: 'f'});
    });
    it('existing project and items for empty path return specifications', async () => {
        (<any>dynamodbMock.query).mockResolvedValueOnce({items: [
                {pr: 'p1', pa: '@', e: 'x'},
                {pr: 'p1', pa: 'd.xxx1', _idx: 0, e: 'f'},
                {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
                {pr: 'p1', pa: 'd.xxx2', _idx: 1, e: 'h'},
            ], count: 4, scannedCount: 20});
        expect(await getPath({pr: 'p1', pa: ''})).toEqual({e: 'x', d: [{id: 'xxx1', e: 'f'}, {id: 'xxx2', e: 'h'}, {id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']}]});
    });
    it('existing project and items for empty path return specifications (queried with @)', async () => {
        (<any>dynamodbMock.query).mockResolvedValueOnce({items: [
                {pr: 'p1', pa: '@', e: 'x'},
                {pr: 'p1', pa: 'd.xxx1', _idx: 0, e: 'f'},
                {pr: 'p1', pa: 'd.xxx3', _idx: 2, e: 'g', kk: ['one', 'two', 'three']},
                {pr: 'p1', pa: 'd.xxx2', _idx: 1, e: 'h'},
            ], count: 4, scannedCount: 20});
        expect(await getPath({pr: 'p1', pa: '@'})).toEqual({e: 'x', d: [{id: 'xxx1', e: 'f'}, {id: 'xxx2', e: 'h'}, {id: 'xxx3', e: 'g', kk: ['one', 'two', 'three']}]});
    });
});
