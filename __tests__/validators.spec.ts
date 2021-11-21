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
});