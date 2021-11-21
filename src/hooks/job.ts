import sfn from '../services/aws/sfn';

export default ({o, stateMachine, input}) => async data => {
    await sfn.startExecution({stateMachine, input: input || data, namePrefix: `${o.replace(/_/g, '-')}-`});
    return data;
}