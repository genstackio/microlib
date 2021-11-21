import caller from '../services/caller';

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
        await Promise.all(
            ((page || {}).items || []).map(
                async item =>
                    caller.execute(`${type}_delete`, {...query, id: item.id}, `${dir}/services/crud`)
            )
        );
    } catch (e: any) {
        console.error(e);
    }
    return queryOrResult;
}