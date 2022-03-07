export function replaceFn(pattern, fn: Function, startTagPattern = '\\[\\[', endTagPattern = '\\]\\]') {
    const r = new RegExp(`${startTagPattern}([^${startTagPattern}${endTagPattern}]+)${endTagPattern}`, 'g');

    return [...pattern.matchAll(r)].reduce((acc, m) => {
        for (let i = 0; i < (m.length - 1); i++) {
            acc = acc.replace(m[0], fn(m[i + 1]));
        }
        return acc;
    }, pattern);
}

export default replaceFn;