console.log('Loading LeetCode GitHub extension');

const languages = {
    'C': {
        ext: '.c',
        lang: 'c'
    },
    'C#': {
        ext: '.cs',
        lang: 'csharp'
    },
    'C++': {
        ext: '.cpp',
        lang: 'cpp'
    },
    'Dart': {
        ext: '.dart',
        lang: 'dart'
    },
    'Elixir': {
        ext: '.ex',
        lang: 'elixir'
    },
    'Erlang': {
        ext: '.erl',
        lang: 'erlang'
    },
    'Go': {
        ext: '.go',
        lang: 'go'
    },
    'Java': {
        ext: '.java',
        lang: 'java'
    },
    'JavaScript': {
        ext: '.js',
        lang: 'javascript'
    },
    'Kotlin': {
        ext: '.kt',
        lang: 'kotlin'
    },
    'PHP': {
        ext: '.php',
        lang: 'php'
    },
    'Python': {
        ext: '.py',
        lang: 'python'
    },
    'Python3': {
        ext: '.py',
        lang: 'python3'
    },
    'Racket': {
        ext: '.rkt',
        lang: 'racket'
    },
    'Ruby': {
        ext: '.rb',
        lang: 'ruby'
    },
    'Rust': {
        ext: '.rs',
        lang: 'rust'
    },
    'Scala': {
        ext: '.scala',
        lang: 'scala'
    },
    'Swift': {
        ext: '.swift',
        lang: 'swift'
    },
    'TypeScript': {
        ext: '.ts',
        lang: 'typescript'
    }
}

const path = location.pathname;
const titleSlug = path.split('/')[2];

const checkResults = async (submissionId) => new Promise(async resolve => {
    const data = await fetch(`https://leetcode.com/submissions/detail/${submissionId}/check/`).then(res => res.json());
    if (['PENDING', 'STARTED'].includes(data.state)) {
        setTimeout(() => resolve(checkResults(submissionId)), 1000);
    } else {
        resolve(data);
    }
});

(async () => {
    const { questionId: question_id, title } = await fetch('https://leetcode.com/graphql/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: `query questionTitle($titleSlug: String!) { 
                question(titleSlug: $titleSlug) {
                    questionId title
                } 
            }`,
            variables: { titleSlug },
            operationName: 'questionTitle'
        })
    }).then(res => res.json()).then(({ data }) => data.question);

    const editor = document.getElementById('editor');

    const { submitButton, linesEl, languageEl } = await new Promise(resolve => {
        const observer = new MutationObserver((_, mutationInstance) => {
            const submitButton = document.querySelector('[data-e2e-locator="console-submit-button"]');
            const linesEl = editor.querySelector('.view-lines');
            const languageEl = editor.querySelector('[data-headlessui-state]');
            if (submitButton && linesEl && languageEl) {
                mutationInstance.disconnect();
                resolve({ submitButton, linesEl, languageEl });
            }
        });

        observer.observe(editor, {
            characterData: true,
            attributes: true,
            childList: true
        });
    });

    submitButton.addEventListener('click', async e => {
        const port = chrome.runtime.connect({ name: 'content' });
        port.onMessage.addListener(request => {
            try {
                switch (request.type) {
                    case 'saveSuccess':
                        port.disconnect();
                        submitButton.toggleAttribute('disabled');
                        location.href = request.submissionUrl;
                        break;
                    default:
                        throw new Error('No type given in message')
                }
            } catch (e) {
                console.error(e);
            }  
        });

        e.stopPropagation();
        submitButton.toggleAttribute('disabled');
        const langKey = languageEl.querySelector('div').querySelector('div').textContent;
        const { lang, ext } = languages[langKey];
        const typed_code = Array.from(linesEl.children).map(line => Array.from(line.children[0].children).map(el => el.textContent).join('')).join('\n');
        if (typed_code === '/') {
            alert('Please exit out of submission window before submitting editor code.');
            submitButton.toggleAttribute('disabled');
            return;
        }
        const { submission_id } = await fetch(`/problems/${titleSlug}/submit/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrftoken': document.cookie.split('; ').find(cookie => cookie.includes('csrftoken')).split('=')[1]
            },
            body: JSON.stringify({ lang, typed_code, question_id })
        }).then(res => res.json());
        const { status_msg } = await checkResults(submission_id);
        const submissionUrl = `https://leetcode.com/problems/two-sum/submissions/${submission_id}/`;
        if (status_msg === 'Accepted') {
            port.postMessage({
                type: 'save',
                filename: `${question_id}-${titleSlug}${ext}`,
                code: typed_code,
                submissionUrl,
                title
            });
        } else {
            port.disconnect();
            submitButton.toggleAttribute('disabled');
            location.href = submissionUrl;
        }
    });
})();