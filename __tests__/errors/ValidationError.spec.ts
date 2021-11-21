import ValidationError from '../../src/errors/ValidationError';

describe('ValidationError', () => {
    it('throwable', async () => {
        try {
            // noinspection ExceptionCaughtLocallyJS
            throw new ValidationError({});
        } catch (e: any) {
            expect(e.message).toEqual("Validation error (0)\n\nerrors:\n  - ");
        }
    });
    it('serializable', async () => {
        try {
            // noinspection ExceptionCaughtLocallyJS
            throw new ValidationError({});
        } catch (e: any) {
            expect(e.serialize()).toEqual({
                code: 412,
                data: {},
                errorInfo: {},
                errorType: 'validation',
                message: 'Validation error',
            });
        }
    });
});