import sfn from '../services/aws/sfn';

// noinspection JSUnusedGlobalSymbols
export default ({o, stateMachine, input}) => async data => {
    await sfn.startExecution({stateMachine, input: input || data, namePrefix: `${o.replace(/_/g, '-')}-`});
    return data;
}