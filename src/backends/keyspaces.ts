import {mBackendError} from "../m";
import cassandra from 'cassandra-driver';
import fs from 'fs';
import sigV4 from 'aws-sigv4-auth-cassandra-plugin';
import DocumentNotFoundError from "@ohoareau/errors/lib/DocumentNotFoundError";

function createClient(keyspace: string|undefined) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const host = `cassandra.${region}.amazonaws.com`;

    return new cassandra.Client({
        contactPoints: [host],
        localDataCenter: region,
        authProvider: new sigV4.SigV4AuthProvider({
            region,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
        sslOptions: {
            ca: [fs.readFileSync(`${__dirname}/../../resources/sf-class2-root.crt`, 'utf-8')],
            host,
            rejectUnauthorized: true
        },
        keyspace,
        protocolOptions: { port: 9142 },
        queryOptions: {
            fetchSize: 1000, // @warn maximum 5000 rows retrieved, see: https://docs.datastax.com/en/developer/nodejs-driver/4.3/features/paging/index.html
        }
    });
}
function convertColumnName(name: string) {
    let n = name.split(/_/g).map(x => `${x.slice(0, 1).toUpperCase()}${x.slice(1)}`).join('');
    return `${n.slice(0, 1).toLowerCase()}${n.slice(1)}`;
}
function convertRows(rows: any[], opts: { renameColumnNames : boolean }) {
    if (!opts?.renameColumnNames) return rows;

    return (rows || []).map(x => {
        return Object.entries(x).reduce((acc, [k, v]) => {
            acc[convertColumnName(k)] = v;
            return acc;
        }, {} as any);
    });
}

type query = {
    query?: string;
    queryParams?: Record<string, any>;
    limit?: number;
    renameColumnNames?: boolean;
    throwErrorIfNone?: boolean;
    offset?: string;
};

// noinspection JSUnusedGlobalSymbols
export default ({name}: any, _: any) => {

    const keyspace = process.env[`KEYSPACES_${name.toUpperCase()}_KEYSPACE_NAME`] || process.env.KEYSPACES_KEYSPACE_NAME || undefined;
    const table = process.env[`KEYSPACES_${name.toUpperCase()}_TABLE_NAME`] || (process.env.KEYSPACES_TABLE_NAME_PATTERN || '').replace('{{name}}', name) || undefined;
    const client = createClient(keyspace);

    function prepareQuery(query, _: Record<string, any> | undefined, limit: number | undefined) {
        let q = (query || '').replace(/\{\{table_name}}/ig, table || '');
        ((undefined !== limit) && (null !== limit)) && (q = `${q} LIMIT ${Number(limit) || 1}`);
        return q;
    }
    async function execute({query, queryParams = undefined, offset = undefined, limit = undefined, renameColumnNames = false, throwErrorIfNone = false}: query) {
        try {
            const finalQuery = prepareQuery(query, queryParams, limit);
            const rr = await client.execute(finalQuery, queryParams, { ...(offset ? { pageState: offset } : {})}); // keep the await
            if (!rr?.rows?.[0]) {
                if (throwErrorIfNone) { // noinspection ExceptionCaughtLocallyJS
                    throw new DocumentNotFoundError(name, '?');
                }
            }
            return {items: convertRows(rr.rows || [], {renameColumnNames}), count: rr.rows?.length || 0, cursor: rr.pageState};
        } catch (e: any) {
            try {
                if (e && e.getStatus && ('function' === typeof e.getStatus)) {
                    const status = e.getStatus();
                    switch (status) {
                        case 404:
                            await mBackendError(e, 'keyspaces', {data: {status, query, queryParams: queryParams}});
                            return {cursor: undefined, items: [], count: 0};
                        default:
                            // noinspection ExceptionCaughtLocallyJS
                            throw e;
                    }
                }
            } catch (e2: any) {
                // there was an unexpected error when trying to get the status of the previous error, so ignore
                throw e;
            }
            throw e;
        }
    }

    async function executeOne({ throwErrorIfNone = true, ...q }: query) {
        try {
            const r = await execute(q);
            if (!r?.items?.[0]) {
                if (throwErrorIfNone) { // noinspection ExceptionCaughtLocallyJS
                    throw new DocumentNotFoundError(name, '?');
                }
                return undefined;
            }
            return r.items[0];
        } catch (e: any) {
            try {
                if (e && e.getStatus && ('function' === typeof e.getStatus)) {
                    const status = e.getStatus();
                    switch (status) {
                        case 404:
                            await mBackendError(e, 'keyspaces', {data: {status, query: q.query, queryParams: q.queryParams}});
                            return undefined;
                        default:
                            // noinspection ExceptionCaughtLocallyJS
                            throw e;
                    }
                }
            } catch (e2: any) {
                // there was an unexpected error when trying to get the status of the previous error, so ignore
                throw e;
            }
            throw e;
        }
    }
    return {
        execute,
        executeOne,
    };
}