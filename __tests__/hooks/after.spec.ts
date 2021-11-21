import after from '../../src/hooks/after';

describe('after', () => {
    it('execute', async () => {
        expect(await after()({}, undefined)).toEqual({});
    });
});