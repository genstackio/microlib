import ses from '../../services/aws/ses';

export default ({to, cc, bcc, body, bodyText, subject, source, sourceArn}) => async result => {
    await ses.sendEmail({to, cc, bcc, body, bodyText, subject, source, sourceArn});
    return result;
}