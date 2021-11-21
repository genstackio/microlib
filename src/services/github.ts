import fetch from 'node-fetch';

const repositoryDispatch = async (org: string, repo: string, type: string, data: any = {}, options: any = {}) => {
    const token = (options || {}).token || process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${org}/${repo}/dispatches`;
    const res = await fetch(
        url,
        {
            method: 'post',
            body: JSON.stringify({
                event_type: type,
                client_payload: data,
            }),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.everest-preview+json',
                'Authorization': `token ${token}`,
            },
        }
    );
    if (!res.ok) throw new Error('Bad response status (not 2xx)');
    return {status: 'success', url};
}

export default {repositoryDispatch}

