import cognito from '../services/aws/cognito';

export default ({userPool}) => async data => {
    await cognito.deleteUser({userPool, id: data.id});
    return data;
}