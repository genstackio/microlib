import replaceFn from "./replaceFn";

export function replaceVars(pattern, data = {}, startTagPattern = '\\{\\{', endTagPattern = '\\}\\}') {
    pattern = replaceFn(pattern, (x: string) => ((x.slice(0, 12) === 'process.env.') ? process.env[x.slice(12)] : undefined) || '', '\\[\\[', '\\]\\]');

    const replacer = (k: string) => {
        let defaultValue: any = undefined;
        if (-1 < k.indexOf('||')) {
            const tokens = k.split('||');
            k = tokens[0];
            defaultValue = tokens[1];
        }
        const [kk, filter = undefined] = k.split('|') as [string, string?];
        let value: any = ('undefined' === typeof data[kk]) ? defaultValue : data[kk];
        switch (filter) {
            case 'url': value = encodeURIComponent(value); break;
            case 'upper': value = (value || '').toUpperCase(); break;
            case 'lower': value = (value || '').toLowerCase(); break;
            default: break;
        }
        return value || '';
    }
    
    return replaceFn(pattern, replacer, startTagPattern, endTagPattern);
}

export default replaceVars;