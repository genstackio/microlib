import fs from "fs";
import cassandra from "cassandra-driver";
import sigV4 from 'aws-sigv4-auth-cassandra-plugin';
import DocumentNotFoundError from "@ohoareau/errors/lib/DocumentNotFoundError";

const clientCaches: Record<string, cassandra.Client> = {};

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
            // defaults to 1000 rows returned max per (network) request (like DynamoDB)
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

function getClient(keyspace: string | undefined) {
    const k = keyspace || 'default';
    if (!clientCaches[k]) {
        clientCaches[k] = createClient(k);
    }

    return clientCaches[k];
}
export default {
    getDb: ({name, catchError}: { name: string, catchError: Function }) => {
        const keyspace = process.env[`KEYSPACES_${name.toUpperCase()}_KEYSPACE_NAME`] || process.env.KEYSPACES_KEYSPACE_NAME || undefined;
        const table = process.env[`KEYSPACES_${name.toUpperCase()}_TABLE_NAME`] || (process.env.KEYSPACES_TABLE_NAME_PATTERN || '').replace('{{name}}', name) || undefined;
        const client = getClient(keyspace);

        function prepareQuery(query, queryParams: Record<string, unknown> | undefined, { offset = undefined, limit = undefined }: { offset?: string; limit?: number }) {
            const finalQuery = (query || '').replace(/\{\{table_name}}/ig, table || '');
            const finalQueryParams = queryParams;
            const finalOptions = {
                ...((undefined !== limit && null !== limit) ? { fetchSize: limit } : {}),
                ...(offset ? { pageState: offset } : {}),
            };
            return [finalQuery, finalQueryParams, finalOptions];
        }
        async function execute({query, queryParams = undefined, offset = undefined, limit = undefined, renameColumnNames = false, throwErrorIfNone = false}: query) {
            try {
                const [finalQuery, finalQueryParams, finalOptions] = prepareQuery(query, queryParams, {offset, limit});
                const rr = await client.execute(finalQuery, finalQueryParams, finalOptions); // keep the await
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
                                await catchError(e, 'keyspaces', {data: {status, query, queryParams: queryParams}});
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
                                await catchError(e, 'keyspaces', {data: {status, query: q.query, queryParams: q.queryParams}});
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
};
