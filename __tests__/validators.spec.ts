jest.mock('../src/services/caller');
import * as validators from "../src/validators";

const complexWorkflow1 = {
    undefined: ['CREATED'],
    CREATED: ['PROMISED', 'PAID', 'CANCELED', 'FAILED', 'ADMIN_CANCEL'],
    PROMISED: ['PAID', 'CANCELED', 'FAILED', 'ADMIN_CANCEL'],
    PAID: ['SUCCESS_ACK', 'CANCELED', 'ADMIN_CANCEL'],
    CANCELED: ['CANCEL_ACK', 'ADMIN_CANCEL'],
    FAILED: ['FAIL_ACK', 'ADMIN_CANCEL'],
    FAIL_ACK: ['ADMIN_CANCEL'],
    CANCEL_ACK: ['ADMIN_CANCEL'],
    SUCCESS_ACK: ['ADMIN_CANCEL'],
    ADMIN_CANCEL: ['ADMIN_CANCELED'],
};
import caller from '../src/services/caller';

beforeEach(() => {
    jest.resetAllMocks();
})
describe('validators', () => {
    [
        ['year', 2020, {}, true, ''],
        ['year', 1754, {}, false, 'Year must be >= 1800 and <= 2100 (actual: 1754)'],
        ['min', 10, {value: 10}, true, ''],
        ['max', 10, {value: 10}, true, ''],
        ['max', 11, {value: 10}, false, 'Max not satisfied (11 > 10)'],
        ['transition', 'PAID', {transitions: undefined, property: 'status', query: {oldData: {status: 'PAID'}}}, false, "Already in 'PAID' step"],
        ['transition', 'PAID', {transitions: undefined, property: 'status', query: {oldData: {status: 'CREATED'}}}, true, ''],
        ['transition', 'PAID', {transitions: complexWorkflow1, property: 'status', query: {oldData: {status: 'PAID'}}}, false, "Already in 'PAID' step"],
        ['transition', 'CREATED', {transitions: complexWorkflow1, property: 'status', query: {oldData: {status: 'PAID'}}}, false, "Transition from 'PAID' to 'CREATED' is not allowed (allowed: ADMIN_CANCEL, CANCELED, SUCCESS_ACK)"],
        ['transition', 'PAID', {transitions: complexWorkflow1, property: 'status', query: {}}, false, "Value 'PAID' is not allowed (allowed: CREATED)"],
    ]
        .forEach(
            ([type, value, config, expected, expectedMessage]: any) => it(`${type}(${JSON.stringify(value)} + ${JSON.stringify(config)}) => ${JSON.stringify(expected)}`, () => {
                const {test, message} = validators[type](config);
                expect(test(value)).toEqual(expected);
                if (!expected) expect(message(value)).toEqual(expectedMessage);
            })
        )
    ;

    it('unique with none in db (create mode)', async () => {
        const uniqueValidator = validators.unique({type: 'my_type', hashKey: 'id', index: undefined, dir: '/some/dir'});
        (<jest.Mock>caller.execute).mockResolvedValue({items: []});
        await expect(uniqueValidator.check('aaa')).resolves.toEqual(undefined);
    });
    it('unique with existing in db (create mode)', async () => {
        const uniqueValidator = validators.unique({type: 'my_type', hashKey: 'id', index: undefined, dir: '/some/dir'});
        (<jest.Mock>caller.execute).mockResolvedValue({
            items: [{}]
        });
        await expect(uniqueValidator.check('aaa')).rejects.toThrowError(
            new Error('my_type already exist for id is equal to aaa, restricted due to uniqueness constraint')
        );
    });
    it('unique with none in db (update mode)', async () => {
        const uniqueValidator = validators.unique({type: 'my_type', hashKey: 'id', index: undefined, dir: '/some/dir'});
        (<jest.Mock>caller.execute).mockResolvedValue({items: []});
        await expect(uniqueValidator.check('aaa', {id: 'someId'})).resolves.toEqual(undefined);
    });
    it('unique with existing in db (update mode) and not same', async () => {
        const uniqueValidator = validators.unique({type: 'my_type', hashKey: 'id', index: undefined, dir: '/some/dir'});
        (<jest.Mock>caller.execute).mockResolvedValue({
            items: [{id: 'xxx'}]
        });
        await expect(uniqueValidator.check('aaa', {id: 'yyy'})).rejects.toThrowError(
            new Error('my_type already exist for id is equal to aaa, restricted due to uniqueness constraint')
        );
    });
    it('unique with existing in db (update mode) and same', async () => {
        const uniqueValidator = validators.unique({type: 'my_type', hashKey: 'id', index: undefined, dir: '/some/dir'});
        (<jest.Mock>caller.execute).mockResolvedValue({
            items: [{id: 'xxx'}]
        });
        await expect(uniqueValidator.check('aaa', {id: 'xxx'})).resolves.toEqual(undefined);
    });
});