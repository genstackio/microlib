jest.mock('../../src/services/caller');

import callerMock from '../../src/services/caller';
import updateReferences from '../../src/hooks/update-references';

beforeEach(() => {
    jest.resetAllMocks();
})
describe('updateReferences', () => {
    it('execute with nothing', async () => {
        const model = {};
        expect(await updateReferences({o: 'bla', model, dir: '.'})({}, undefined)).toEqual({});
    });
    it('execute with no trackers', async () => {
        const model = {
            referenceTargets: {},
        }
        expect(await updateReferences({o: 'bla', model, dir: '.'})({}, undefined)).toEqual({});
    });
    it('execute with trackers', async () => {
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            cursor: undefined,
            count: 4,
            items: [
                {
                    id: 'item-1',
                },
                {
                    id: 'item-2',
                    x: 11,
                },
                {
                    id: 'item-3',
                    x: 12,
                },
                {
                    id: 'item-4',
                    x: 12,
                    t: 'other',
                }
            ]
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'first-update',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'second-update',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'third-update',
        });
        const model = {
            referenceTargets: {
                a_b: {
                    game__id: {
                        join: 'game',
                        idField: 'id',
                        trackedFields: {
                            x: {},
                            y: {},
                            z: {},
                            t: {},
                        }
                    }
                },
                c_d: {
                    game__id: {
                        join: 'game',
                        idField: 'id',
                        trackedFields: {
                            z: {},
                        }
                    }
                }
            },
        }
        const query = {
            oldData: {
                id: 'aaaa-bbbb',
                x: 11,
                y: 15,
                z: 'ab',
                t: 'one',
                u: 'hello',
            }
        }
        const result = {
            x: 12, // tracked + changed
            y: 15, // tracked + unchanged
            z: 'ab', // tracked + unchanged
            t: 'other', // tracked + changed
            w: 'world', // untracked
        }
        expect(await updateReferences({o: 'bla', model, dir: '.'})(result, query)).toEqual(result);
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            1,
            'a_b_find',
            [
                {
                    criteria: {
                        game: 'aaaa-bbbb',
                    },
                    fields: ['cursor', 'game', 'id', 'x', 't'],
                    limit: 500,
                    offset: undefined,
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            2,
            'a_b_update',
            [
                {
                    data: {
                        game: 'aaaa-bbbb',
                    },
                    id: 'item-1',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            3,
            'a_b_update',
            [
                {
                    data: {
                        game: 'aaaa-bbbb',
                    },
                    id: 'item-2',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            4,
            'a_b_update',
            [
                {
                    data: {
                        game: 'aaaa-bbbb',
                    },
                    id: 'item-3',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            5,
            'a_b_update',
            [
                {
                    data: {
                        game: 'aaaa-bbbb',
                    },
                    id: 'item-4',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenCalledTimes(5);
    });
});