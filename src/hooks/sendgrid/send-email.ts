import sendgrid from '../../services/sendgrid';

export default ({to, cc, bcc, body, bodyText, subject, source}) => async result => {
    await sendgrid.sendMail({to, cc, bcc, html: body, text: bodyText, subject, from: source});
    return result;
}