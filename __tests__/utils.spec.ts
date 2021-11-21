const testMock = jest.fn();
jest.mock('../src/hooks/test', () => ({default: testMock}), {virtual: true});
import {buildAllowedTransitions, createHelpers, isTransition} from '../src/utils';

beforeEach(() => {
    jest.resetAllMocks();
});

describe('createHelpers', () => {
    it('return a function', () => {
        const {hook} = createHelpers({name: 'x_y'}, __dirname)('z');
        expect(hook).toEqual(expect.any(Function));
    });
    it('call specified hook type and return computed value', async () => {
        testMock.mockReturnValue(async () => 12);
        const {hook} = createHelpers({name: 'x_y'}, __dirname)('z');
        await expect(hook('@test', [])).resolves.toEqual(12);
    });
    it('call specified hook type in a loop with non object items (async) and return array of computed values', async () => {
        testMock.mockReturnValue(async () => 12);
        const {hook} = createHelpers({name: 'x_y'}, __dirname)('z');
        await expect(hook('@test', [{items: ['a', 'b', 'c']}], {x: '[[value]]'}, {loop: 'items'})).resolves.toEqual(12);
        expect(testMock).toHaveBeenNthCalledWith(1, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'a', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(2, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'b', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(3, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'c', hook: expect.any(Function)});
    });
    it('call specified hook type in a loop with object items (async) and return array of computed values', async () => {
        testMock.mockImplementation(({x, y}) => async () => `x => ${x}, y => ${y}`);
        const {hook} = createHelpers({name: 'x_y'}, __dirname)('z');
        await expect(hook('@test', [{items: [{id: 'abc', name: 'a-b-c'}, {id: 'def', name: 'd-e-f'}, {id: 'ghi', name: 'g-h-i'}]}], {x: '[[id]]', y: '[[name]]'}, {loop: 'items'})).resolves.toEqual('x => ghi, y => g-h-i');
        expect(testMock).toHaveBeenNthCalledWith(1, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'abc', y: 'a-b-c', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(2, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'def', y: 'd-e-f', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(3, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: 'ghi', y: 'g-h-i', hook: expect.any(Function)});
    });
    it('call specified hook type in a loop with object items (async) and return array of computed values (recursive replaced values)', async () => {
        testMock.mockReturnValue(async () => 13);
        const {hook} = createHelpers({name: 'x_y'}, __dirname)('z');
        await expect(hook('@test', [{items: [{id: 'abc', name: 'a-b-c'}, {id: 'def', name: 'd-e-f'}, {id: 'ghi', name: 'g-h-i'}]}], {x: {y: {t: '[[id]]'}}, z: 'hello'}, {loop: 'items'})).resolves.toEqual(13);
        expect(testMock).toHaveBeenNthCalledWith(1, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: {y: {t: 'abc'}}, z: 'hello', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(2, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: {y: {t: 'def'}}, z: 'hello', hook: expect.any(Function)});
        expect(testMock).toHaveBeenNthCalledWith(3, {o: 'x_y_z', model: {name: 'x_y'}, dir: expect.any(String), x: {y: {t: 'ghi'}}, z: 'hello', hook: expect.any(Function)});
    });
});
describe('isTransition', () => {
    [
        ['@x[a => b] when a => b, return true', 'x', 'a', 'b', {x: 'a'}, {x: 'b'}, true],
        ['@x[a => b] when -, return false', 'x', 'a', 'b', {x: 'a'}, {}, false],
        ['@x[a => b] when a => c, return false', 'x', 'a', 'b', {x: 'a'}, {x: 'c'}, false],
        ['@x[a => b] when - => b, return false', 'x', 'a', 'b', undefined, {x: 'b'}, false],
        ['@x[* => b] when - => b, return true', 'x', '*', 'b', undefined, {x: 'b'}, true],
        ['@x[* => b] when a => b, return true', 'x', '*', 'b', {x: 'a'}, {x: 'b'}, true],
        ['@x[* => b] when b => b, return false', 'x', '*', 'b', {x: 'b'}, {x: 'b'}, false],
    ]
        .forEach(
            ([name, attribute, from, to, oldData, newData, expected]) => it(<string>name, () => {
                expect(isTransition(attribute, from , to, {data: newData, oldData})).toStrictEqual(expected);
            })
        )
    ;
});

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

describe('buildAllowedTransitions', () => {
    [
        [undefined, undefined, ['*']],
        [undefined, 'CREATED', ['*']],
        [{}, undefined, []],
        [{}, 'CREATED', []],
        [{'*': ['*']}, undefined, ['*']],
        [{'*': ['*']}, 'CREATED', ['*']],
        [{'*': ['PAID']}, 'CREATED', ['PAID']],
        [{'CREATED': ['PAID']}, 'CREATED', ['PAID']],
        [{'CREATED': ['PAID'], 'PAID': ['SUCCESS_ACK']}, 'CREATED', ['PAID']],
        [{'CREATED': ['PAID'], 'PAID': ['SUCCESS_ACK']}, 'PAID', ['SUCCESS_ACK']],
        [{'CREATED': ['PAID'], 'PAID': ['SUCCESS_ACK']}, 'SUCCESS_ACK', []],
        [complexWorkflow1, undefined, ['CREATED']],
        [complexWorkflow1, 'CREATED', ['ADMIN_CANCEL', 'CANCELED', 'FAILED', 'PAID', 'PROMISED']],
    ]
        .forEach(
            ([transitions, current, allowed]: any) => it(`${current}(${JSON.stringify(transitions)}) => ${JSON.stringify(allowed)}`, () => {
                expect(buildAllowedTransitions(transitions, current, 'undefined')).toEqual(allowed);
            })
        )
})