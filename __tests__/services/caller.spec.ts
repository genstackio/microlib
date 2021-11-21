import caller from '../../src/services/caller';

describe('caller', () => {
    it('execute exists', async () => {
        expect('function' === typeof caller.execute).toBeTruthy();
    });
});