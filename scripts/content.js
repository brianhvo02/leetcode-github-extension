console.log('Loading LeetCode GitHub extension');

const observer = new MutationObserver((_, mutationInstance) => {
    const submitButton = document.querySelector('[data-e2e-locator="console-run-button"');
    const linesEl = document.querySelector('.view-lines');
    
    if (submitButton && linesEl) {
        submitButton.addEventListener('click', () => {
            const code = Array.from(document.querySelector('.view-lines').children).map(line => Array.from(line.children[0].children).map(el => el.textContent).join('')).join('\n');
            console.log(code)
        });
        mutationInstance.disconnect();
    }
});

observer.observe(document, {
    childList: true,
    subtree: true
});