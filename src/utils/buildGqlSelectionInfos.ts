export function buildGqlSelectionInfos(query: any, attribute: string) {
    const incomingName = (query?.aliases || {})[attribute] || attribute;
    const selection = (query?.selections || {})[incomingName] || (((query?.selections || {})['items'] || {})['selections'] || {})[incomingName] || {};
    const selected = Object.values((selection || {})['fields'] || []);

    return [selection, selected];
}

export default buildGqlSelectionInfos;