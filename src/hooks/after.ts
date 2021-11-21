export default () => async (result, data) => {
    if (!data) return result;
    if (!data.volatileData || 0 === Object.keys(data.volatileData).length) {
        delete data.volatileData;
        return result;
    }
    Object.assign(data.data, data.volatileData);
    result = await result;
    Object.assign(result, data.volatileData);
    delete data.volatileData;
    return result;
}