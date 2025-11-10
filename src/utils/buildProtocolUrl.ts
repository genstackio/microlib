export function buildProtocolUrl(pattern: string|undefined, varName: string, value: string|undefined, env: string|undefined) {
  let [s, uri = '']: [string, string?] = (value || '').split(':') as [string, string?];
  const [name, nameProd = ''] = s.split(',');
  const isProd = env === 'prod';
  return `${(pattern || '').replace(new RegExp(`\{\{${varName}\}\}`, 'g'), (isProd ? nameProd : name) || name)}${uri}`;
}

export default buildProtocolUrl;
