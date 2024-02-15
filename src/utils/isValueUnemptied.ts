export function isValueUnemptied(attribute, data) {
    const old = (data && data.oldData) ? data.oldData[attribute] : undefined;
    const current = (data && data.data) ? data.data[attribute] : undefined;
    if ((old !== undefined) && (old !== null) && (old !== 0) && (old !== '')) return false;
    return (current !== undefined) && (current !== null) && (current !== '**clear**') && (current !== '') && (current !== 0);
}

export default isValueUnemptied;