import {v4 as uuid} from 'uuid';
import caller from '../services/caller';

export default model => ({
    execute: async ({id, name, lambdaArn, data}) => {
        const startTime = new Date().valueOf();
        const result = await caller.executeRemoteLambda(lambdaArn, data);
        const endTime = new Date().valueOf();
        return {
            id: uuid(),
            result,
            function: {id, name, lambdaArn},
            execution: {startTime, duration: endTime - startTime, endTime},
            metadata: {
                modelName: model.name,
            },
        };
    },
})