import {detectVersion} from '../../src/middlewares/apigateway';

describe('detectVersion', () => {
    it('v1', () => {
        expect(detectVersion(require('../../__fixtures__/apigateway-events/v1.json'))).toEqual('v1');
    });
    it('v2', () => {
        expect(detectVersion(require('../../__fixtures__/apigateway-events/v2.json'))).toEqual('v2');
    });
});