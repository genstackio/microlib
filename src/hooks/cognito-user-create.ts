import cognito from '../services/aws/cognito';

export default ({userPool, group, adminGroup}) => async data => {
    const attributes: {[key: string]: any} = {email: data.email, email_verified: true};
    if (data.phone) {
        attributes.phone_number = data.phone;
        attributes.phone_number_verified = true;
    }
    const user = await cognito.createUser({userPool: userPool, username: data.email, attributes});
    data.id = user.id;
    const groups = group ? [group] : [];
    data.admin && adminGroup && groups.push(adminGroup);
    await cognito.addUserToGroupsByUsername({userPool, username: user.username, groups});
    return data;
}