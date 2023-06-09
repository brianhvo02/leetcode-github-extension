const signInButton = document.getElementById('signIn');

(async () => {
    
    let {
        accessToken,
        refreshToken,
        expiresIn,
        refreshTokenExpiresIn
    } = chrome.storage.session.get([
        'accessToken',
        'refreshToken',
        'expiresIn',
        'refreshTokenExpiresIn'
    ]);
    if (!chrome.storage.session.get('accessToken').accessToken) {
        await chrome.runtime.sendMessage({ type: 'login' });
    }
    console.log(
        accessToken,
        refreshToken,
        expiresIn,
        refreshTokenExpiresIn
    )
})();