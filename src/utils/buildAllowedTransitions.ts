export function buildAllowedTransitions(transitions: any, value: string|undefined, valueIfUndefined: string) {
    let allowed: string[] = [];
    const current = value || valueIfUndefined;
    if (!transitions) {
        // no transitions defined, all are allowed
        return ['*'];
    }
    if (!transitions[current]) {
        // transitions defined, but none for the current step requested
        if (!!transitions['*']) {
            // a fallback is defined in transitions
            allowed = transitions['*'];
        } else {
            allowed = [];
        }
    } else {
        allowed = [...transitions[current], ...(transitions['*'] || [])];
    }

    allowed = Object.keys(allowed.reduce((acc, v) => Object.assign(acc, {[v]: true}), {}));
    allowed.sort();
    return allowed;
}

export default buildAllowedTransitions;