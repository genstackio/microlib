export function isGreaterOrEqualThan(attribute, value, data, key = 'data') {
    return data && data[key] && (value <= data[key][attribute]);
}

export default isGreaterOrEqualThan;