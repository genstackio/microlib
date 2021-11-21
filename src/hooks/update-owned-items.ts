export default ({field, mode = 'pre'}) => async (queryOrResult, queryOrEmpty) => {
    const data = ('pre' === mode) ? queryOrResult.data : queryOrResult;

    if (data[field]) throw new Error(`Updating directly the '${field}' is not allowed`);

    return queryOrResult;
}