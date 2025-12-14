import client from '../services/aws/dynamodbv2';
import {mError} from "../m";

const MAX_N = 50;
const MAX_M = 50;

export async function uniquable<T = any>(type: string, fn: () => Promise<T>, unique: boolean = false): Promise<T> {
  let v: T|undefined;
  let z: boolean|undefined;
  let n = 0;
  do {
    v = await fn();
    n++;
  } while (unique && (z = await isDuplicateValue(type, v)) && (n <= MAX_N))
  if (unique && z) throw new Error(`Could not register unique value for type ${type} (tried ${n} times, max=${MAX_N})`);
  return v;
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isDuplicateValue(type: string, value: any): Promise<boolean> {
  const id = `${type}#${value}`;
  const TABLE_NAME = process.env.UNIQUABLE_TABLE;

  if (!TABLE_NAME) {
    try {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`No uniquable table defined`);
    } catch (error: any) {
      await mError(error, { tags: { no_uniquable_table: true }})
      // silent error to avoid blocking
      return false;
    }
  }
  let result: boolean | undefined = undefined;
  let n = 0;
  do {
    if (n > 0) await wait(100);
    try {
      await client.put({
        TableName: TABLE_NAME!,
        Item: {
          id: { S: id },
        },
        ConditionExpression: 'attribute_not_exists(id)'
      });
      result = false;
    } catch (error: any) {
      switch (error.name) {
        case 'ConditionalCheckFailedException':
          // is a duplicate
          result = true;
          break;
        case 'ProvisionedThroughputExceededException':
        case 'RequestLimitExceeded':
        case 'RequestTimeoutException':
        case 'NetworkingError':
        case 'ServiceUnavailableException':
        case 'ThrottlingException':
        case 'LimitExceededException':
        case 'BackupInUseException':
        case 'BackupNotFoundException':
          await mError(error, { tags: { uniquable_table_error: true }, data: { type, value, id, n }})
          // retry
          result = undefined;
          break;
        default:
          // is an unexpected error
          throw error;
      }
    }
    n++;
  } while (undefined === result && (n <= MAX_M));
  return undefined === result ? true : result;
}

export default uniquable;
