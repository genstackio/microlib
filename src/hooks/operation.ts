import caller from '../services/caller';

export default ({operation, params, dir}) => async data => {
    await caller.execute(operation, params, `${dir}/services/crud`);
    return data;
}