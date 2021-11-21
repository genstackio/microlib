import diffdb from '../services/diffdb';

export default model => diffdb.getDb({name: model.name})