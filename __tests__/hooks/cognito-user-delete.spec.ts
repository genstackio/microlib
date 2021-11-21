jest.mock('../../src/services/aws/cognito');

import cognitoServiceMock from '../../src/services/aws/cognito';
import cognitoUserDelete from '../../src/hooks/cognito-user-delete';

describe('cognito-user-delete', () => {
    it('execute', async () => {
        (<any>cognitoServiceMock.deleteUser).mockResolvedValue({});
        expect(await cognitoUserDelete({userPool: 'up'})({id: 'abcd'})).toEqual({id: 'abcd'});
    });
});