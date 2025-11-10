import buildProtocolUrl from "../../src/utils/buildProtocolUrl";

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});
describe('buildProtocolUrl', () => {
  ([
      [undefined, 'xx', undefined, undefined, ''],
      ['https://a.com', 'xx', undefined, undefined, 'https://a.com'],
      ['https://a.com', 'xx', 'z', undefined, 'https://a.com'],
      ['https://a.com/{{xx}}', 'xx', 'z', undefined, 'https://a.com/z'],
      ['https://a.com/{{xx}}', 'xx', 'z', undefined, 'https://a.com/z'],
      ['https://a.com/{{xx}}', 'xx', 'z', undefined, 'https://a.com/z'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws', undefined, 'https://myws.dev.example.com'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws:/a/b', undefined, 'https://myws.dev.example.com/a/b'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws,myprodws:/a/b', undefined, 'https://myws.dev.example.com/a/b'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws,myprodws:/a/b', 'dev', 'https://myws.dev.example.com/a/b'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws,myprodws:/a/b', 'prod', 'https://myprodws.dev.example.com/a/b'],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws,^XYZ_ENDPOINT:/a/b', 'prod', 'https://myxyzendpoint.com/a/b', {XYZ_ENDPOINT: 'https://myxyzendpoint.com'}],
      ['https://{{webservice}}.dev.example.com', 'webservice', 'myws,^https__//myop.com/xc/d:/a/b', 'prod', 'https://myop.com/xc/d/a/b'],
    ] as [string|undefined, string, string|undefined, string|undefined, string|undefined, Record<string, string>?][])
        .forEach(
            ([pattern, varName, value, env, expected, envs]: [string|undefined, string, string|undefined, string|undefined, string|undefined, Record<string, string>?]) => {
              it(`${pattern} + ${varName} + ${value} + ${env} => ${expected}`, () => {
                !!envs && (process.env = {...originalEnv, ...envs});
                expect(buildProtocolUrl(pattern, varName, value, env)).toEqual(expected);
              })
            }
        )
    ;
})
