import mozjexl from 'mozjexl';

export async function evaluate(expression: string, vars: any = {}) {
    return mozjexl.eval(expression, vars)
}

export default evaluate;