import stats from '../services/stats';

export default config => async (result, query) => stats.reset({...config, result, query});
