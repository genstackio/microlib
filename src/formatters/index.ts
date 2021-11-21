export default {
    'application/json': res => res.body = JSON.stringify(res.body),
    'application/json; charset=UTF-8': res => res.body = JSON.stringify(res.body),
    'default': () => {},
}