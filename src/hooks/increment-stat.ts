import stats from '../services/stats';

export default config => async (result, query) => stats.increment({...config, result, query});
