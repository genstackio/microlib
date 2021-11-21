import dynamoose, {applyQuerySort} from '../../src/services/dynamoose';

describe('dynamoose', () => {
    it('getDb exists', async () => {
        expect('function' === typeof dynamoose.getDb).toBeTruthy();
    });
});

beforeEach(() => {
    jest.resetAllMocks();
});

describe('applyQuerySort', () => {
    [
        ['ascending', 'ascending'],
        ['descending', 'descending'],
        [-1, 'descending'],
        [1, 'ascending'],
        [{x: 'ascending'}, 'ascending'],
        [{y: 'descending'}, 'descending'],
        [{z: 1}, 'ascending'],
        [{t: -1}, 'descending'],
    ]
        .forEach(([direction, expected]) => it(`sort(${JSON.stringify(direction)}) => ${<any>expected instanceof Error ? `Error: ${(<any>expected).message}` : expected}`, () => {
            const q = {ascending: jest.fn(), descending: jest.fn()};
            let error;
            try {
                applyQuerySort(q, direction);
            } catch (e: any) {
                error = e;
            }
            if (<any>expected instanceof Error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual((<any>expected).message);
            } else {
                expect(q[expected as string]).toHaveBeenCalled();
            }
        }))
    ;
});