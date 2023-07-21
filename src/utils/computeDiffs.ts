export function computeDiffs(a: any, b: any) {
    if (!b) {
        if (!a) return undefined;
        if ('object' !== typeof a) return undefined;
        const diffs = Object.entries(a).reduce((acc, [k, v]) => {
            acc[k] = {old: '**unknown**', new: v};
            return acc;
        }, {} as any);
        return Object.keys(diffs).length ? diffs : undefined;
    }
    if (!a) return undefined;
    if ('object' !== typeof a) return undefined;
    const allDiffs = Object.entries(a).reduce((acc, [k, v]) => {
        if (b[k] !== v) {
            if (!b.hasOwnProperty(k)) {
                acc[k] = {old: '**unknown**', new: v};
            } else {
                if ('object' === typeof b[k]) {
                    const diffs = computeDiffs(v, b[k]);
                    if (!diffs || !Object.keys(diffs).length) return acc;
                }
                acc[k] = {old: b[k], new: v};
            }
        }
        return acc;
    }, {} as any);

    return Object.keys(allDiffs).length ? allDiffs : undefined;
}

export default computeDiffs;