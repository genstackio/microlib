const getBusinessRule = (name: string, dir: string|undefined = undefined) => {
    let t: any = undefined;
    if ('@' === name.slice(0, 1)) {
        name = name.slice(1);
        t = require(`../business-rules/${name}`);
    } else if (!!dir) {
        t = require(`${dir}/business-rules/${name}`);
    }
    return t;
};


async function apply(name: string, vars: any = {}, query: any = undefined, result: any = undefined, failOnError: boolean = true, dir: string|undefined) {
    const br = getBusinessRule(name, dir);

    try {
        if (!br) { // noinspection ExceptionCaughtLocallyJS
            throw new Error(`Unknown business rule '${name}'`);
        }
        await br(vars, query, result);
    } catch (e) {
        console.error('business-rule', name, e, vars);
        if (failOnError) throw e;
    }
}

// noinspection JSUnusedGlobalSymbols
export default {
    apply,
};