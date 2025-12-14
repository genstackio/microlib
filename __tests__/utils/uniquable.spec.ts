jest.mock('../../src/services/aws/dynamodbv2');
import uniquable from "../../src/utils/uniquable";

import dynamodb from '../../src/services/aws/dynamodbv2';


beforeEach(() => {
    process.env.UNIQUABLE_TABLE = 'test-uniquable-table';
    jest.resetAllMocks();
})
describe('uniquable', () => {
  it('need not to be unique', async () => {
    (dynamodb.put as jest.Mock).mockResolvedValue({});
    const fn = jest.fn().mockImplementation(async () => 'vvv0');
    await expect(uniquable('aaa', fn, false)).resolves.toEqual('vvv0');
    expect(dynamodb.put).not.toHaveBeenCalled();
  })
  it('need to be unique, but table name not defined', async () => {
    delete process.env.UNIQUABLE_TABLE;
    const fn = jest.fn()
      .mockImplementationOnce(async () => 'vvvA')
    ;
    await expect(uniquable('aaa', fn, true)).resolves.toEqual('vvvA');
    expect(dynamodb.put).toHaveBeenCalledTimes(0);
  })
  it('need to be unique, first value is unique', async () => {
    (dynamodb.put as jest.Mock).mockResolvedValue({});
    const fn = jest.fn().mockImplementation(async () => 'vvv1');
    await expect(uniquable('aaa', fn,true)).resolves.toEqual('vvv1');
    expect(dynamodb.put).toHaveBeenCalledWith({
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv1' },
      },
    });
  })
  it('need to be unique, first value is not unique, second value is unique', async () => {
    const e1 = new Error('ConditionalCheckFailedException');
    e1.name = 'ConditionalCheckFailedException';
    (dynamodb.put as jest.Mock).mockRejectedValueOnce(e1).mockResolvedValueOnce({});
    const fn = jest.fn()
      .mockImplementationOnce(async () => 'vvv1')
      .mockImplementationOnce(async () => 'vvv2')
    ;
    await expect(uniquable('aaa', fn, true)).resolves.toEqual('vvv2');
    expect(dynamodb.put).toHaveBeenCalledTimes(2);
    expect(dynamodb.put).toHaveBeenNthCalledWith(1, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv1' },
      },
    });
    expect(dynamodb.put).toHaveBeenNthCalledWith(2, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv2' },
      },
    });
  })
  it('need to be unique, first value is not unique, second value is not, third value is unique', async () => {
    const e1 = new Error('ConditionalCheckFailedException');
    e1.name = 'ConditionalCheckFailedException';
    const e2 = new Error('ConditionalCheckFailedException');
    e2.name = 'ConditionalCheckFailedException';
    (dynamodb.put as jest.Mock).mockRejectedValueOnce(e1).mockRejectedValueOnce(e2).mockResolvedValueOnce({});
    const fn = jest.fn()
      .mockImplementationOnce(async () => 'vvv1')
      .mockImplementationOnce(async () => 'vvv2')
      .mockImplementationOnce(async () => 'vvv3')
    ;
    await expect(uniquable('aaa', fn, true)).resolves.toEqual('vvv3');
    expect(dynamodb.put).toHaveBeenCalledTimes(3);
    expect(dynamodb.put).toHaveBeenNthCalledWith(1, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv1' },
      },
    });
    expect(dynamodb.put).toHaveBeenNthCalledWith(2, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv2' },
      },
    });
    expect(dynamodb.put).toHaveBeenNthCalledWith(3, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv3' },
      },
    });
  })
  it('need to be unique, first call is on error due to temp network error, second call is ok', async () => {
    const e1 = new Error('NetworkingError');
    e1.name = 'NetworkingError';
    (dynamodb.put as jest.Mock).mockRejectedValueOnce(e1).mockResolvedValueOnce({});
    const fn = jest.fn()
      .mockImplementationOnce(async () => 'vvv10')
    ;
    await expect(uniquable('aaa', fn, true)).resolves.toEqual('vvv10');
    expect(dynamodb.put).toHaveBeenCalledTimes(2);
    expect(dynamodb.put).toHaveBeenNthCalledWith(1, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv10' },
      },
    });
    expect(dynamodb.put).toHaveBeenNthCalledWith(2, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv10' },
      },
    });
  })
  it('need to be unique, first call is on error due to unknown error, aborting in error', async () => {
    const e1 = new Error('TheUnpexectedError');
    e1.name = 'TheUnpexectedError';
    (dynamodb.put as jest.Mock).mockRejectedValueOnce(e1);
    const fn = jest.fn()
      .mockImplementationOnce(async () => 'vvv11')
    ;
    await expect(uniquable('aaa', fn, true)).rejects.toEqual(e1);
    expect(dynamodb.put).toHaveBeenCalledTimes(1);
    expect(dynamodb.put).toHaveBeenNthCalledWith(1, {
      TableName: 'test-uniquable-table',
      ConditionExpression: 'attribute_not_exists(id)',
      Item: {
        id: { S: 'aaa#vvv11' },
      },
    });
  })
})
