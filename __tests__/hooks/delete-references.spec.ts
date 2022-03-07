jest.mock('../../src/services/caller');

import callerMock from '../../src/services/caller';
import deleteReferences from '../../src/hooks/delete-references';

beforeEach(() => {
    jest.resetAllMocks();
})
describe('deleteReferences', () => {
    it('execute with nothing', async () => {
        const model = {};
        expect(await deleteReferences({model, dir: '.'})({}, undefined)).toEqual({});
    });
    it('execute with no trackers', async () => {
        const model = {
            referenceTargets: {},
        }
        expect(await deleteReferences({model, dir: '.'})({}, undefined)).toEqual({});
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
            id: 'first-delete',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'second-delete',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'third-delete',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'fourth-delete',
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
            id: 'aaaa-bbbb',
        }
        expect(await deleteReferences({model, dir: '.'})(result, query)).toEqual(result);
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            1,
            'a_b_find',
            [
                {
                    criteria: {
                        game: 'aaaa-bbbb',
                    },
                    fields: ['cursor', 'game', 'id'],
                    limit: 500,
                    offset: undefined,
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            2,
            'a_b_delete',
            [
                {
                    id: 'item-1',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            3,
            'a_b_delete',
            [
                {
                    id: 'item-2',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            4,
            'a_b_delete',
            [
                {
                    id: 'item-3',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            5,
            'a_b_delete',
            [
                {
                    id: 'item-4',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenCalledTimes(5);
    });
});