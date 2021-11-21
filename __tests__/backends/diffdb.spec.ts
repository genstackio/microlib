jest.mock('../../src/services/diffdb');

import diffdbServiceMock from '../../src/services/diffdb';
import diffdb from '../../src/backends/diffdb';

beforeAll(() => {
    jest.resetAllMocks();
});

describe('diffdb', () => {
    it('return initialized diffdb db', async () => {
        const expected = {};
        (<any>diffdbServiceMock.getDb).mockReturnValue(expected);
        expect(diffdb({name: 'modelName'})).toEqual(expected);
        expect(diffdbServiceMock.getDb).toHaveBeenCalledWith({name: 'modelName'});
    });
});