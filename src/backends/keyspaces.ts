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
// noinspection JSUnusedGlobalSymbols
export default ({name}: any, _: any) => {

    const keyspace = process.env[`KEYSPACES_${name.toUpperCase()}_KEYSPACE_NAME`] || process.env.KEYSPACES_KEYSPACE_NAME || undefined;
    const table = process.env[`KEYSPACES_${name.toUpperCase()}_TABLE_NAME`] || (process.env.KEYSPACES_TABLE_NAME_PATTERN || '').replace('{{name}}', name) || undefined;
    const client = createClient(keyspace);

    async function execute({query, renameColumnNames = false}: { query: string | undefined, renameColumnNames?: boolean }) {
        try {
            const finalQuery = (query || '').replace(/\{\{table_name}}/ig, table || '');
            const rr = await client.execute(finalQuery); // keep the await
            return {items: convertRows(rr.rows || [], {renameColumnNames}), count: rr.rows?.length || 0, cursor: undefined};
        } catch (e: any) {
            try {
                if (e && e.getStatus && ('function' === typeof e.getStatus)) {
                    const status = e.getStatus();
                    switch (status) {
                        case 404:
                            await mBackendError(e, 'keyspaces', {data: {status, query}});
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

    async function executeOne({ throwErrorIfNone = true, ...q }: { query: string | undefined, renameColumnNames?: boolean, throwErrorIfNone?: boolean }) {
        const r = await execute(q);
        if (!r?.items?.[0]) {
            if (throwErrorIfNone) throw new DocumentNotFoundError(name, '?');
            return undefined;
        }
        return r.items[0];
    }
    return {
        execute,
        executeOne,
    };
}