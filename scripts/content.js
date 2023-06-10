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

const port = chrome.runtime.connect({ name: 'content' });

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

    const observer = new MutationObserver((_, mutationInstance) => {
        const submitButton = document.querySelector('[data-e2e-locator="console-submit-button"]');
        const linesEl = document.querySelector('.view-lines');
        const languageEl = document.getElementById('headlessui-listbox-button-:r2o:');
        
        if (submitButton && linesEl && languageEl) {
            submitButton.addEventListener('click', async e => {
                e.stopPropagation();
                submitButton.setAttribute('disabled', true);
                const langKey = languageEl.querySelector('div').querySelector('div').textContent;
                const { lang, ext } = languages[langKey];
                const typed_code = Array.from(document.querySelector('.view-lines').children).map(line => Array.from(line.children[0].children).map(el => el.textContent).join('')).join('\n');
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
                console.log(status_msg)
                if (status_msg === 'Accepted') {
                    port.postMessage({
                        type: 'save',
                        filename: `${question_id}-${titleSlug}${ext}`,
                        code: typed_code,
                        submissionUrl,
                        title
                    });
                } else {
                    location.href = submissionUrl;
                }
            });
            mutationInstance.disconnect();
        }
    });
    
    observer.observe(document, {
        childList: true,
        subtree: true
    });
})();

port.onMessage.addListener(request => {
    try {
        switch (request.type) {
            case 'saveSuccess':
                location.href = request.submissionUrl;
                break;
            default:
                throw new Error('No type given in message')
        }
    } catch (e) {
        console.error(e);
    }  
});