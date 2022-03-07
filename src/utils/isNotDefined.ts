export function isNotDefined(attribute, data, key = 'data') {
    return !data || !data[key] || (undefined === data[key][attribute]) || (null === data[key][attribute])
}

export default isNotDefined;