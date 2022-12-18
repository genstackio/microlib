import caller from '../services/caller';
import {mHookError} from "../m";

// noinspection JSUnusedGlobalSymbols
export default ({model, type, mode = 'pre', dir}) => async (queryOrResult, queryOrEmpty) => {
    const data = ('pre' === mode) ? queryOrResult.data : queryOrResult;
    const query = ('pre' === mode) ? queryOrResult : queryOrEmpty;
    const parentKey = model.shortName;

    try {
        const page = await caller.execute(
            `${type}_findBy${parentKey.slice(0, 1).toUpperCase()}${parentKey.slice(1)}`,
            {...query, fields: ['id'], [parentKey]: data.id},
            `${dir}/services/crud`
        )
        await Promise.allSettled(
            ((page || {}).items || []).map(
                async item => {
                    try {
                        // keep the await
                        return await caller.execute(`${type}_delete`, {
                            ...query,
                            id: item.id
                        }, `${dir}/services/crud`);
                    } catch (e2: any) {
                        await mHookError(e2, 'delete-owned-items', {data: {type, item, data, parentKey, mode}});
                    }
                }
            )
        );
    } catch (e: any) {
        await mHookError(e, 'delete-owned-items', {data: {type, mode, data, parentKey}});
    }
    return queryOrResult;
}