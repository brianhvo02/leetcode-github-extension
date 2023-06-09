chrome.runtime.onMessage.addListener(async request => {
    try {
        if (request.type === 'login') {
            return await login();
        }
    } catch (e) {
        console.error(e);
        return false;
    }  
});

const login = async () => {
    const responseUrl = await chrome.identity.launchWebAuthFlow({ url: 'https://github.com/login/oauth/authorize?client_id=Iv1.477505c0de1f2cc8', interactive: true });
    const code = responseUrl.slice(responseUrl.indexOf('=') + 1);
    const data = await fetch(`https://lt5wuugsu4ciwcr3ph6wpkjpo40mcsss.lambda-url.us-west-1.on.aws?code=${code}`).then(res => res.json());
    await chrome.storage.session.set(data);

    return true;
}