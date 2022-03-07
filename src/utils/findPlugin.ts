export function findPlugin(type, name, dir) {
    return ('@' === name.slice(0, 1))
        ? require(`../${type}s/${name.slice(1)}`).default
        : require(`${dir}/${type}s/${name}`)
        ;
}

export default findPlugin;