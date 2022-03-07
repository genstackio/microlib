export function isTransition(attribute, from, to, data) {
    const old = (data && data.oldData) ? data.oldData[attribute] : undefined;
    const current = (data && data.data) ? data.data[attribute] : undefined;
    if (old === current) return false;
    return (('*' === to) || (current === to)) && (('*' === from) || (old === from));
}

export default isTransition;