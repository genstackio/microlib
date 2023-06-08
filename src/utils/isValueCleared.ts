export function isValueCleared(attribute, data) {
    const old = (data && data.oldData) ? data.oldData[attribute] : undefined;
    const current = (data && data.data) ? data.data[attribute] : undefined;
    if ((old === undefined) || (old === null)) return false;
    return (current === undefined) || (current === null) || (current === '**cleared**');
}

export default isValueCleared;