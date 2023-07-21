import {eventbridge} from '@ohoareau/aws';
import computeDiffs from "../../utils/computeDiffs";



export default ({source = 'api', o, detailType, docKey = 'doc', userKey = 'user', dataKey = 'data', idKey = 'id', diffKey = 'diff'}: any) => async (result, query) => {
    const diffs = computeDiffs(query?.data, query?.oldData);

    await eventbridge.send(
        detailType || o,
        {
            [docKey]: result,
            [userKey]: query.user,
            ...(query?.data ? {[dataKey]: query?.data} : {}),
            ...((query?.id || result?.id) ? {[idKey]: query?.id || result?.id} : {}),
            ...((diffs && Object.keys(diffs).length) ? {[diffKey]: diffs} : {}),
        },
        source
    );
    return result;
}