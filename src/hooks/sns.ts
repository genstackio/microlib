import sns from '../services/aws/sns';

export default ({o, topic}) => async data => {
    await sns.publish({
        message: data,
        attributes: {
            type: o,
            typeName: o.replace(/_[^_]+$/, ''),
            operation: o.replace(/^.+_([^_]+)$/, '$1'),
        },
        topic: topic,
    });
    return data;
}