const h2 = document.querySelector('h2');
const a = document.querySelector('a');
const p = document.querySelector('p');

const currentDate = new Date();

const port = chrome.runtime.connect({ name: 'popup' });
port.postMessage({ type: 'login' });

const setInfo = async () => {
    const {
        username,
        name,
        repoName,
        repoUrl,
        totalCommits
    } = await chrome.storage.sync.get([
        'username',
        'name',
        'repoName',
        'repoUrl',
        'totalCommits'
    ]);


    h2.textContent = `${name} (${username})`;
    a.textContent = repoName;
    a.href = repoUrl;
    p.textContent = `Current total commits: ${totalCommits}`;
}

port.onMessage.addListener(async request => {
    try {
        switch (request.type) {
            case 'loginSuccess':
                await setInfo();
                break;
            case 'loginFailure':
                h2.textContent = 'Login failure!';
                break;
            default:
                throw new Error('No type given in message')
        }
    } catch (e) {
        console.error(e);
    }  
});

