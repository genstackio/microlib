import {eventbridge} from '@ohoareau/aws';

export default ({source = 'api', o, detailType, docKey = 'doc', userKey = 'user'}: any) => async (result, query) => {
    await eventbridge.send(
        detailType || o,
        {
            [docKey]: result,
            [userKey]: query.user,
        },
        `${process.env.EVENTBRIDGE_SOURCE_PREFIX || ''}${source}`
    );
    return result;
}