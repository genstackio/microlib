export function deduplicateAndSort(x: string[]) {
    x = Object.keys(x.reduce((acc, k) => Object.assign(acc, {[k]: true}), {} as any));

    x.sort();

    return x;
}

export default deduplicateAndSort;