import replaceFn from "./replaceFn";

export function replaceVars(pattern, data = {}, startTagPattern = '\\{\\{', endTagPattern = '\\}\\}') {
    pattern = replaceFn(pattern, (x: string) => ((x.slice(0, 12) === 'process.env.') ? process.env[x.slice(12)] : undefined) || '', '\\[\\[', '\\]\\]');

    return replaceFn(pattern, k => ('undefined' === typeof data[k]) ? '' : data[k], startTagPattern, endTagPattern);
}

export default replaceVars;