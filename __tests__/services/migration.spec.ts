import migration from '../../src/services/migration';

describe('migration', () => {
    it('migrate exists', async () => {
        expect('function' === typeof migration.migrate).toBeTruthy();
    });
});