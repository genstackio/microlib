jest.mock('../../src/services/dynamoose');

import dynamooseServiceMock from '../../src/services/dynamoose';
import dynamoose from '../../src/backends/dynamoose';

beforeAll(() => {
    jest.resetAllMocks();
});

describe('dynamoose', () => {
    it('return initialized dynamoose db', async () => {
        const expected = {};
        (<any>dynamooseServiceMock.getDb).mockReturnValue(expected);
        expect(dynamoose({name: 'modelName'})).toEqual(expected);
        expect(dynamooseServiceMock.getDb).toHaveBeenCalledWith({
            name: 'modelName', schema: {}, schemaOptions: {}, options: {create: false, update: false, waitForActive: false}
        });
    });
});