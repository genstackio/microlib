import stats from '../services/stats';

export default config => async (result, query) => stats.update({...config, result, query});
