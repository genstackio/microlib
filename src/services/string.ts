import evaluate from '../utils/evaluate';

export async function replaceVars(text, props) {
    let xx;
    while ((xx = /\{\{([^}]+)}}/.exec(text)) !== null) {
        text = text.replace(xx[0], await evaluate(xx[1], props) || '');
    }
    return text;
}