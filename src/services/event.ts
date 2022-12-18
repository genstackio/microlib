import sqs from './aws/sqs';
import {loadPlugin} from '../utils';
import {mError} from "../m";

export default (allListeners = {}, {dir = undefined, typeKey = 'type'} = {}) => {
    const consumeMessage = async ({receiptHandle, attributes, rawMessage, eventType, queueUrl}) => {
        let listeners = allListeners[eventType] || [];
        !Array.isArray(listeners) && (listeners = !listeners ? [] : [listeners]);
        const result = {status: 'ignored', message: undefined, listeners: listeners.length};
        if (!listeners.length) {
            await sqs.deleteMessage({queueUrl, receiptHandle});
            return result;
        }
        const message = JSON.parse(rawMessage);
        try {
            await Promise.all(listeners.map(async listener => loadPlugin('listener', listener, {dir})(
                message,
                {attributes, queueUrl, receiptHandle}
            )));
            result.status = 'processed';
            await sqs.deleteMessage({queueUrl, receiptHandle});
        } catch (e: any) {
            result.status = 'failed';
            result.message = e.message;
            await mError(e, {tags: {mechanism: 'event'}, data: {receiptHandle, attributes, rawMessage, eventType, queueUrl}});
        }
        return result;
    };
    const processDirectMessage = async r =>
        consumeMessage({
            receiptHandle: r.receiptHandle,
            rawMessage: r.body,
            attributes: Object.entries(r.messageAttributes).reduce((acc, [k, m]) => {
                acc[k] = (<any>m).stringValue;
                return acc;
            }, {}),
            eventType: r.messageAttributes[typeKey].stringValue.toLowerCase().replace(/\./g, '_'),
            queueUrl: sqs.getQueueUrlFromEventSourceArn(r['eventSourceARN']),
        })
    ;
    const processEncapsulatedMessage = async r => {
        const body = JSON.parse(r.body);
        return consumeMessage({
            receiptHandle: r.receiptHandle,
            rawMessage: body.Message,
            attributes: Object.entries(body.MessageAttributes).reduce((acc, [k, m]) => {
                acc[k] = (<any>m).Value;
                return acc;
            }, {}),
            eventType: ((body.MessageAttributes[typeKey] || {}).Value || 'unknown').toLowerCase().replace(/\./g, '_'),
            queueUrl: sqs.getQueueUrlFromEventSourceArn(r['eventSourceARN']),
        });
    };
    return {
        consume: async ({Records = []}) =>
            Promise.all(Records.map(async r =>
                (r['messageAttributes'] && r['messageAttributes'][typeKey] && r['messageAttributes'][typeKey]['stringValue'])
                    ? processDirectMessage(r)
                    : processEncapsulatedMessage(r)
            ))
        ,
    };
}