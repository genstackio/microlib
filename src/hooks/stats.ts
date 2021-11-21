import track from './track';
export default ({mode, ...config}) => track({...config, type: `@update_stat_on_${mode}`});