import {captureError} from "./manager";

export async function mError(e: any, ctx?: any) {
    ctx = {...ctx, tags: {framework: 'microlib', ...(ctx.tags || {})}};

    return captureError(e, ctx);
}

export async function mHookError(e: any, hook: string, ctx: any = {}) {
    return mError(e, {...ctx, tags: {mechanism: 'hook', hook, ...(ctx.tags || {})}});
}

export async function mBackendError(e: any, backend: string, ctx: any = {}) {
    return mError(e, {...ctx, tags: {mechanism: 'backend', backend, ...(ctx.tags || {})}});
}

export async function mAuthorizerError(e: any, authorizer: string, ctx: any = {}) {
    return mError(e, {...ctx, tags: {mechanism: 'authorizer', authorizer, ...(ctx.tags || {})}});
}

export async function mConverterError(e: any, converter: string, ctx: any = {}) {
    return mHookError(e, 'convert', {...ctx, tags: {converter, ...(ctx.tags || {})}});
}

export async function mValidatorError(e: any, validator: string, ctx: any = {}) {
    return mHookError(e, 'validator', {...ctx, tags: {validator, ...(ctx.tags || {})}});
}

export async function mBusinessRuleError(e: any, name: string, vars: any, query: any, result: any, ctx: any = {}) {
    return mHookError(e, 'business-rule', {...ctx, data: {vars, result, id: query.id, data: query.data, oldData: query.oldData, ...(ctx.data || {})}, tags: {business_rule: name, ...(ctx.tags || {})}});
}
