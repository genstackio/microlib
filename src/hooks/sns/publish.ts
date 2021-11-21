import sns from '../../services/aws/sns';

export default ({topic, attributes = {}}) => async (message, messageAttributes = {}) => {
    await sns.publish({message, attributes: {...attributes, ...messageAttributes}, topic});
}