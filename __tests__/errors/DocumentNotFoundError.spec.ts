import DocumentNotFoundError from '../../src/errors/DocumentNotFoundError';

describe('DocumentNotFoundError', () => {
    it('throwable', async () => {
        try {
            // noinspection ExceptionCaughtLocallyJS
            throw new DocumentNotFoundError('theType', 'theId');
        } catch (e: any) {
            expect(e.message).toEqual("theType 'theId' does not exist");
        }
    });
    it('id is not a string', async () => {
        try {
            // noinspection ExceptionCaughtLocallyJS
            throw new DocumentNotFoundError('theType', ['theNon', 'StringId']);
        } catch (e: any) {
            expect(e.message).toEqual("theType '[\"theNon\",\"StringId\"]' does not exist");
        }
    });
    it('serializable', async () => {
        try {
            // noinspection ExceptionCaughtLocallyJS
            throw new DocumentNotFoundError('theType2', 'theId2');
        } catch (e: any) {
            expect(e.serialize()).toEqual({
                code: 404,
                data: {},
                errorInfo: {
                    id: 'theId2',
                    type: 'theType2',
                },
                errorType: 'document-not-found',
                message: "theType2 'theId2' does not exist",
            });
        }
    });
});