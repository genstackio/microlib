import caller from "./caller";

async function increment({name, join, value, dir, query, result}: {name: string, join: string, value: number, dir: string, query: any, result: any}) {
    const {type, statFieldName, id} = buildInfos({name, join, query, result});
    await callRawUpdateOnItem(type, id, {
        '$in': {
            [statFieldName]: value,
        },
    }, dir);
}

async function decrement({name, join, value, dir, query, result}: {name: string, join: string, value: number, dir: string, query: any, result: any}) {
    const {type, statFieldName, id} = buildInfos({name, join, query, result});
    await callRawUpdateOnItem(type, id, {
        '$dec': {
            [statFieldName]: value,
        },
    }, dir);
}

async function reset({name, join, dir, query, result}: {name: string, join: string, dir: string, query: any, result: any}) {
    const {type, statFieldName, id} = buildInfos({name, join, query, result});
    await callRawUpdateOnItem(type, id, {
        '$reset': [statFieldName],
    }, dir);
}

async function update({action: {type}, ...rest}: any) {
    switch (type) {
        case '@inc': return increment({...rest, value: 1});
        case '@dec': return decrement({...rest, value: 1});
        case '@clear': return reset(rest);
        default: console.log(`Unsupported update action type for stat: '${type}'`); break;
    }
}

function buildInfos({name, join, query, result}: {name: string, join: string, query: any, result: any}) {
    const [type, statFieldName] = name.split('.');
    const id = (result && result[join]) || (query && query.data && query.data[join]) || (query && query.oldData && query.oldData[join]);
    if (!id) {
        console.error(`Unable to retrieve id of ${type} from result/query/query.oldData for updating '${statFieldName}' stat`);
    }

    return {type, statFieldName, id};
}

async function callRawUpdateOnItem(type: string, id: string|undefined, data: any, dir: string) {
    if (!id) return;
    return caller.execute(
        `${type}_rawUpdate`,
        {id, data},
        `${dir}/services/crud`,
    );
}

const service = {
    increment,
    decrement,
    reset,
    update
};

export default service;