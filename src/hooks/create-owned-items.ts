import caller from '../services/caller';

export default ({model, field, type, mode = 'pre', dir}) => async (queryOrResult, queryOrEmpty) => {
    const data = ('pre' === mode) ? queryOrResult.data : queryOrResult;
    const query = ('pre' === mode) ? queryOrResult : queryOrEmpty;
    const parentKey = model.shortName;

    await Promise.all(
        (data[field] || []).map(
            async item =>
                caller.execute(
                    `${type}_create`,
                    {...query, data: {...item, [parentKey]: data.id}},
                    `${dir}/services/crud`
                )
        )
    );
    return queryOrResult;
}