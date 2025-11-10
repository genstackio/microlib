export function buildProtocolUrl(pattern: string|undefined, varName: string, value: string|undefined, env: string|undefined) {
  let [s, uri = '']: [string, string?] = (value || '').split(':') as [string, string?];
  const [name, nameProd = ''] = s.split(',');
  const isProd = env === 'prod';
  const selectedName = (isProd ? nameProd : name) || name;
  const realPattern = ('^' === selectedName?.[0]) ? ('https__//' === selectedName.slice(1, 10) ? (selectedName.slice(1).replace(/__/g, ':')) : process.env[selectedName.slice(1)]) : pattern;
  return `${(realPattern || '').replace(new RegExp(`\{\{${varName}\}\}`, 'g'), selectedName)}${uri}`;
}

export default buildProtocolUrl;
