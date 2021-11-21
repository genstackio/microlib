import formatters from './formatters';
import d from 'debug';
// noinspection JSUnusedGlobalSymbols
export {createHelpers as helpers} from './utils';

export const apply = async (ms: any[], args) =>
    ms[0](...args, async () => (ms.length > 1) ? apply(ms.slice(1), args) : undefined)
;

const debugEvent = d('micro:event');
const debugContext = d('micro:context');
const debugResult = d('micro:result');
const debugException = d('micro:exception');
const debugApp = d('micro:app');

export const micro = (ms: any[] = [], ems: any[] = [], fn: Function|undefined, options: any = {}) =>
    async (event: any = {}, context: any = {}) => {
        try {
            debugEvent('%j', event);
            debugContext('%j', context);
            const req: any = {
                headers: {},
                body: undefined,
                ...event,
                ...((options && options['params']) ? ((event || {}).params) : event || {}),
                ...((options && options['rootDir']) ? {rootDir: options['rootDir']} : {}),
                requestId: (context || {})['awsRequestId'],
                event,
                context,
                options,
            };
            const res: any = {headers: {}, statusCode: 200, body: {}, formatters, bodyOnly: ('undefined' !== typeof event.bodyOnly) ? !!event.bodyOnly : true};
            req.debug = debugApp;
            req.res = res;
            res.req = req;
            res.send = res.json = x => { res.body = x; return res; };
            res.set = (k, v) => { res.headers[k] = v; return res; };
            res.header = res.setHeader = res.set;
            res.status = c => { res.statusCode = c; return res; };
            res.get = res.getHeader = k => res.headers[k];
            res.end = () => res;
            res.type = res.contentType = c => res.set('Content-Type', c);
            try {
                await apply(fn ? [...ms, async (req, res) => res.send(await fn(req))] : ms, [req, res]);
            } catch (e: any) {
                debugException('%j', e)
                await apply([...ems, async e => { throw e; }], [e, req, res]);
            }
            (res.formatters[res.headers['Content-Type']] || res.formatters['default'])(res);
            const x = res.bodyOnly ? res.body : {statusCode: res.statusCode, body: res.body, headers: res.headers};
            debugResult('%j', x);
            return x;
        } catch (e: any) {
            if (context?.throwError) throw e;
            debugException('%j', e);
            const x = {statusCode: 500, body: JSON.stringify({status: 'error', message: e.message})};
            debugResult('%j', x)
            return x;
        }
    }
;

export default micro