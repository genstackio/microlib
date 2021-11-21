jest.mock('../../src/services/caller');

import callerServiceMock from '../../src/services/caller';
import operation from '../../src/hooks/operation';

describe('operation', () => {
    it('execute', async () => {
        (<any>callerServiceMock.execute).mockResolvedValue({});
        expect(await operation({operation: 'op', params: {p: 1}, dir: 'xxx'})({id: 'abcd'})).toEqual({id: 'abcd'});
    });
});