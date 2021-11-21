jest.mock('../../src/services/aws/cognito');

import cognitoServiceMock from '../../src/services/aws/cognito';
import cognitoUserCreate from '../../src/hooks/cognito-user-create';

describe('cognito-user-create', () => {
    it('execute', async () => {
        (<any>cognitoServiceMock.createUser).mockResolvedValue({id: 'id1', username: 'username1'});
        (<any>cognitoServiceMock.addUserToGroupsByUsername).mockResolvedValue({});
        expect(await cognitoUserCreate({userPool: 'up', group: 'g1', adminGroup: 'g2'})({})).toEqual({
            id: 'id1',
        });
    });
});