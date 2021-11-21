import {createHash} from 'crypto';

function hash(value, algorithm = 'md5') {
    return createHash(algorithm).update(value || '').digest("hex");
}
function md5(value) {
    return hash(value, 'md5');
}
function sha1(value) {
    return hash(value, 'sha1');
}
function sha256(value) {
    return hash(value, 'sha256');
}
function sha512(value) {
    return hash(value, 'sha512');
}

export default {
    hash, md5, sha1, sha256, sha512,
}