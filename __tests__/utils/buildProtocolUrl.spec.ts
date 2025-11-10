import buildProtocolUrl from "../../src/utils/buildProtocolUrl";

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
    ] as [string|undefined, string, string|undefined, string|undefined, string|undefined][])
        .forEach(
            ([pattern, varName, value, env, expected]: [string|undefined, string, string|undefined, string|undefined, string|undefined]) => {
              it(`${pattern} + ${varName} + ${value} + ${env} => ${expected}`, () => {
                expect(buildProtocolUrl(pattern, varName, value, env)).toEqual(expected);
              })
            }
        )
    ;
})
