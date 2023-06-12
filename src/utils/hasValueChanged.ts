export function hasValueChanged(attribute, data) {
    let old = (data && data.oldData) ? data.oldData[attribute] : undefined;
    let current = (data && data.data) ? data.data[attribute] : undefined;
    if ((old === undefined) || (old === null) || (old === '')) old = undefined;

    if ((current === undefined) || (current === null)) return false;

    if ((current === '*cleared*') || (current === '')) current = undefined;

    return current !== old;
}

export default hasValueChanged;