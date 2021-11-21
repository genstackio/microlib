import eventFactory from '../../src/services/event';

describe('event', () => {
    it('consume exists', async () => {
        const service = eventFactory({});
        expect('function' === typeof service.consume).toBeTruthy();
    });
});