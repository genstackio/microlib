export default ({model: {volatileFields}}) => async data => {
    data.volatileData = !!data.volatileData ? data.volatileData : {};
    Object.entries(data.data).forEach(([k, v]) => {
        if (volatileFields[k]) {
            data.volatileData[k] = v;
            delete data.data[k];
        }
    });
    return data;
}