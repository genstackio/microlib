// noinspection JSUnusedGlobalSymbols
export default ({properties}: any) => async ({data, ...query}: any) => {
    properties.map((p) => {data[p] = JSON.parse(data[p])});
    return {...query, data};
}