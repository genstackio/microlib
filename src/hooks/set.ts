export default ({value, key}) => async data => {
    data[key] = value;
    return data;
}