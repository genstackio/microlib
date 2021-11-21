import stats from '../services/stats';

export default config => async (result, query) => stats.decrement({...config, result, query});
