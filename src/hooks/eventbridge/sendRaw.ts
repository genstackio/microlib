import {eventbridge} from '@ohoareau/aws';

export default ({type, source = 'api', ...data}: any) => async (result, _) => {
    await eventbridge.send(
        type,
        data,
        source
    );
    return result;
}