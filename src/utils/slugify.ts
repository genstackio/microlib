export function slugify(v: any, sep: string = '-') {
    v = v || '';
    v = v.toLowerCase();
    v = v.replace(/[éèêëęėē]+/g, 'e');
    v = v.replace(/[àâªáäãåā]+/g, 'a');
    v = v.replace(/[ÿ]+/g, 'y');
    v = v.replace(/[ûùüúū]+/g, 'u');
    v = v.replace(/[îïìíįī]+/g, 'i');
    v = v.replace(/[ôºöòóõøō]+/g, 'o');
    v = v.replace(/[çćč]+/g, 'c');
    v = v.replace(/[ñń]+/g, 'n');
    v = v.replace(/[œ]+/g, 'oe');
    v = v.replace(/[æ]+/g, 'ae');
    v = v.replace(/[$]+/g, ' dollar');
    v = v.replace(/[€]+/g, ' euro');
    v = v.replace(/[@]+/g, ' at');
    v = v.replace(/[&]+/g, ' and');
    v = v.replace(/[§]+/g, ' s ');
    v = v.replace(/[%]+/g, ' percent ');

    v = v.replace(/[^a-z0-9-]+/g, ' ').replace(/[\s]+/g, ' ')
    v = v.trim();
    v = v.replace(/[\s]+/g, sep);

    return !!v ? v : undefined;
}

export default slugify;