export function isModulo(attribute, value, data, key = 'data') {
    return data && data[key] && (0 === (value % data[key][attribute]));
}

export default isModulo;