import stats from './stats';
export default config => stats({...config, mode: 'create'});