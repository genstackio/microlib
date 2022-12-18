import {IManager} from "./types";

const managers: IManager[] = [];

// noinspection JSUnusedGlobalSymbols
export function registerManager(manager: IManager) {
    managers.push(manager);
}

// noinspection JSUnusedGlobalSymbols
export async function captureError(e: any, ctx?: any, options?: any) {
    return callManagers('captureError', [e, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureMessage(message: string, ctx?: any, options?: any) {
    return callManagers('captureMessage', [message, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureMessages(messages: string[], ctx?: any, options?: any) {
    return callManagers('captureMessages', [messages, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureProperty(type: string, data?: any, ctx?: any, options?: any) {
    return callManagers('captureProperty', [type, data, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureData(bulkData?: any, ctx?: any, options?: any) {
    return callManagers('captureData', [bulkData, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureEvent(event: any, ctx?: any, options?: any) {
    return callManagers('captureEvent', [event, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureTag(tag: string, value?: any, ctx?: any, options?: any) {
    return callManagers('captureTag', [tag, value, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureTags(tags: any, ctx?: any, options?: any) {
    return callManagers('captureTags', [tags, ctx, options]);
}
// noinspection JSUnusedGlobalSymbols
export async function captureUser(user: any, ctx?: any, options?: any) {
    return callManagers('captureUser', [user, ctx, options]);
}

async function callManagers(method: string, args: any[] = []) {
    try {
        const reports = await Promise.allSettled(managers.map(async m => m[method] ? m[method](...args) : undefined));
        const errors = reports.filter((x: any) => x?.status !== 'fulfilled').map((x: any) => x?.reason);
        errors?.forEach(e => {
            console.error(e);
        });
    } catch (e2: any) {
        console.error(e2);
    }
}