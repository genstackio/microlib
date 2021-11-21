import lambda from '../../services/aws/lambda';

export default ({arn}) => async payload => {
    await lambda.execute(arn, payload, {async: true});
    return payload;
}