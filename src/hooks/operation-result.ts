import caller from '../services/caller';

export default ({operation, params, dir}) => async () =>
    caller.execute(operation, params, `${dir}/services/crud`)
;