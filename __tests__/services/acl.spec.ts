import acl from '../../src/services/acl';

describe('acl', () => {
    const acls = {
        permissions: {
            role1: {
                '*': true,
                'op1': true,
                'op2': false,
            },
            role2: {
                'op1': true,
                'op2': false,
            },
            role3: {
                'op1': true,
            },
            role4: {
                'op1': false,
                'op2': true,
            },
            role5: {
            },
            role6: {
                '*': false,
            },
            role7: {
                '*': true,
            },
        },
    };
    const service = acl(acls);
    [
        ['unknown role / unknown operation', 'unknown', 'unknown', false],
        ['unknown role / known operation', 'unknown', 'op1', false],
        ['allowed specific operation for role', 'role2', 'op1', true],
        ['allowed specific operation for role that have wildcard as well', 'role1', 'op1', true],
        ['allowed wildcard operation for role without specific operation allowed', 'role7', 'op1', true],
        ['role without any operation allowed', 'role5', 'op1', false],
    ]
        .forEach(
            ([name, role, operation, expected]) => it(`${<string>name} => ${expected ? 'allowed' : 'not-allowed'}`, async () => {
                expect(await service.test(<string>role, <string>operation)).toEqual(expected);
            })
        )
    ;
});