const ghFetch = async (endpoint, accessToken, options = {}) => 
    fetch(`https://api.github.com${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github+json',
            ...(options.headers ?? {})
        }
    }).then(res => res.json());
    
const getRepo = async (username, accessToken) => {
    const repo = await ghFetch(`/repos/${username}/leetcode-exercises`, accessToken);

    if (repo.message === 'Not Found') {
        return ghFetch(`/user/repos`, accessToken, {
            method: 'POST',
            body: JSON.stringify({
                name: 'leetcode-exercises',
                private: true
            })
        });
    } else {
        return repo;
    }
}

const login = async () => {
    const {
        expiresIn,
        refreshTokenExpiresIn
    } = await chrome.storage.sync.get([
        'expiresIn',
        'refreshTokenExpiresIn'
    ]);

    const currentDate = new Date();
    console.log('Current date:', currentDate.toLocaleString('en-US'));
    console.log('Token expires:', new Date(expiresIn ?? 0).toLocaleString('en-US'));

    let auth;
    if (!expiresIn || new Date(expiresIn ?? 0) < currentDate) {
        let code, refreshToken;

        if (new Date(refreshTokenExpiresIn ?? 0) < currentDate) {
            console.log('Logging in')
            const responseUrl = await chrome.identity.launchWebAuthFlow({ 
                url: 'https://github.com/login/oauth/authorize?client_id=Iv1.477505c0de1f2cc8', 
                interactive: true 
            }).then(res => res.includes('error') ? undefined : res).catch(() => {});
            
            if (!responseUrl) return;

            code = responseUrl.slice(responseUrl.indexOf('=') + 1);
        } else {
            refreshToken = await chrome.storage.sync.get('refreshToken').then(obj => obj.refreshToken);
        }

        auth = await fetch(`https://lt5wuugsu4ciwcr3ph6wpkjpo40mcsss.lambda-url.us-west-1.on.aws?${code ? `code=${code}` : `refresh_token=${refreshToken}`}`).then(res => res.json());
    } else {
        auth = await chrome.storage.sync.get([
            'accessToken',
            'expiresIn',
            'refreshToken',
            'refreshTokenExpiresIn'
        ]);
    }

    const installations = await ghFetch('/user/installations', auth.accessToken);
    if (installations.total_count === 0) {
        const res = await chrome.identity.launchWebAuthFlow({ url: 'https://github.com/apps/leetcode-github-extension/installations/new', interactive: true })
            .then(res => res.includes('error') ? undefined : res).catch(() => {});
        if (!res)
            return;
    }

    const user = await ghFetch('/user', auth.accessToken);

    const repo = await getRepo(user.login, auth.accessToken);

    const contributors = await ghFetch(`/repos/${repo.full_name}/contributors`, auth.accessToken);
    const totalCommits = contributors[0].contributions;

    return {
        ...auth,
        username: user.login,
        name: user.name,
        repoName: repo.full_name,
        repoUrl: repo.html_url,
        totalCommits
    };
}

const save = async ({ filename, code, submissionUrl, title }) => {
    const details = await login();
    const file = await ghFetch(`/repos/${details.repoName}/contents/${filename}`, details.accessToken);
    const res = await ghFetch(`/repos/${details.repoName}/contents/${filename}`, details.accessToken, {
        method: 'PUT',
        body: JSON.stringify({
            message: `${title} - ${submissionUrl}`,
            content: btoa(code),
            ...(file.sha ? { sha: file.sha } : {})
        })
    });

    return res ? submissionUrl : undefined;
}

chrome.runtime.onConnect.addListener(async port => {
    switch (port.name) {
        case 'popup':
            port.onMessage.addListener(async (request, port) => {
                try {
                    if (request.type === 'login') {
                        const details = await login();
                        await chrome.storage.sync.set(details);
                        port.postMessage({ type: details ? 'loginSuccess' : 'loginFailure' });
                    }
                } catch (e) {
                    console.error(e);
                }  
            });
            break;
        case 'content':
            port.onMessage.addListener(async (request, port) => {
                try {
                    if (request.type === 'save') {
                        const submissionUrl = await save(request);
                        if (submissionUrl) port.postMessage({ type: 'saveSuccess', submissionUrl });
                    }
                } catch (e) {
                    console.error(e);
                }  
            });
            break;
    }
});

chrome.runtime.onInstalled.addListener(() => login());