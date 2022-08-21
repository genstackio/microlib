export async function evaluate(expression: string, vars: any = {}) {
    return require('mozjexl').eval(expression, vars)
}

export default evaluate;