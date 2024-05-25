import {mBackendError} from '../m';
import keyspaces from '../services/keyspaces';

// noinspection JSUnusedGlobalSymbols
export default (x: any, _: any) => {
    return keyspaces.getDb({ ...x, catchError: mBackendError });
}