jest.mock('../../src/services/caller');

import callerMock from '../../src/services/caller';
import updateStats from '../../src/hooks/update-stats';

beforeEach(() => {
    jest.resetAllMocks();
})
describe('updateStats', () => {
    it('execute with nothing', async () => {
        const model = {};
        expect(await updateStats({o: 'bla', on: 'create', model, dir: '.'})({}, undefined)).toEqual({});
    });
    it('execute with no trackers', async () => {
        const model = {
            statTargets: {},
        }
        expect(await updateStats({o: 'bla', on: 'create', model, dir: '.'})({}, undefined)).toEqual({});
    });
    it('execute with trackers', async () => {
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            cursor: undefined,
            count: 2,
            items: [
                {
                    id: 'item-1',
                },
                {
                    id: 'item-2',
                },
            ]
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'first-update',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'second-update',
        });
        const model = {
            statTargets: {
                create: {
                    a_b: {
                        game__id: {
                            myStat1: {
                                join: 'game',
                                action: {type: '@inc'},
                                mode: 'count',
                            },
                            myStat2: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y) / 2.5'}},
                                mode: 'count',
                            },
                            myStat3: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y) / 3', round: 'ceil'}},
                                mode: 'count',
                            },
                            myStat4: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y) / 3', round: 'floor'}},
                                mode: 'count',
                            },
                            myStat5: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y)', ratio: 100}},
                                mode: 'count',
                            },
                        },
                    },
                },
            },
        }
        const query = {
            oldData: {
                id: 'aaaa-bbbb',
                game: 'xxx',
                y: 3,
            }
        }
        const result = {
            id: 'aaaa-bbbb',
            x: 7,
        }
        expect(await updateStats({o: 'bla', on: 'create', model, dir: '.'})(result, query)).toEqual(result);
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            1,
            'a_b_find',
            [
                {
                    criteria: {
                        id: 'xxx',
                    },
                    fields: ['cursor', 'id'],
                    limit: 500,
                    offset: undefined,
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            2,
            'a_b_rawUpdate',
            [
                {
                    data: {
                        '$inc': {
                            myStat1: 1,
                            myStat2: 4,
                            myStat3: 4,
                            myStat4: 3,
                            myStat5: 0.1,
                        },
                    },
                    id: 'item-1',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            3,
            'a_b_rawUpdate',
            [
                {
                    data: {
                        '$inc': {
                            myStat1: 1,
                            myStat2: 4,
                            myStat3: 4,
                            myStat4: 3,
                            myStat5: 0.1,
                        },
                    },
                    id: 'item-2',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenCalledTimes(3);
    });
    it('execute with trackers depending on joined', async () => {
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            cursor: undefined,
            count: 2,
            items: [
                {
                    id: 'item-1', a: 1, a0: 2, c: 3
                },
                {
                    id: 'item-2', a: 10, a0: 20, c: 30
                },
            ]
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'first-update',
        });
        (callerMock.execute as jest.Mock).mockResolvedValueOnce({
            id: 'second-update',
        });
        const model = {
            statTargets: {
                create: {
                    a_b: {
                        game__id: {
                            myStat1: {
                                join: 'game',
                                action: {type: '@inc'},
                                mode: 'count',
                            },
                            myStat2: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y) / 2.5'}},
                                mode: 'count',
                            },
                            myStat6: {
                                join: 'game',
                                action: {type: '@inc', config: {value: '(new.x + old.y + joined.a + joined.c + joined.a0 + joined.a)', ratio: 100}},
                                mode: 'count',
                            },
                        },
                    },
                },
            },
        }
        const query = {
            oldData: {
                id: 'aaaa-bbbb',
                game: 'xxx',
                y: 3,
            }
        }
        const result = {
            id: 'aaaa-bbbb',
            x: 7,
        }
        expect(await updateStats({o: 'bla', on: 'create', model, dir: '.'})(result, query)).toEqual(result);
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            1,
            'a_b_find',
            [
                {
                    criteria: {
                        id: 'xxx',
                    },
                    fields: ['cursor', 'id', 'a', 'a0', 'c'],
                    limit: 500,
                    offset: undefined,
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            2,
            'a_b_rawUpdate',
            [
                {
                    data: {
                        '$inc': {
                            myStat1: 1,
                            myStat2: 4,
                            myStat6: 0.17,
                        },
                    },
                    id: 'item-1',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenNthCalledWith(
            3,
            'a_b_rawUpdate',
            [
                {
                    data: {
                        '$inc': {
                            myStat1: 1,
                            myStat2: 4,
                            myStat6: 0.80,
                        },
                    },
                    id: 'item-2',
                }
            ],
            './services/crud'
        );
        expect(callerMock.execute).toHaveBeenCalledTimes(3);
    });
});