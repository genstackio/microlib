import caller from '../services/caller';

const mutate = (params, data) => {
    return data; // @todo implement params mutation for value with '{{data...}}'
};

export default ({operation, params, dir}) => async d =>  caller.execute(operation, mutate(params, d), `${dir}/services/crud`)