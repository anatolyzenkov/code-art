document.addEventListener("DOMContentLoaded", (event) => {
    (() => {
        const eventBlocker = (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
        }

        const onClick = (e) => {
            if (button.classList.contains('toggle')) {
                button.classList.remove('toggle');
                card.classList.remove('visible');
            } else {
                button.classList.add('toggle');
                card.classList.add('visible');
            }
            eventBlocker(e);
        }

        const projectTitle = document.title.split(' |')[0];
        const card = document.getElementById('info-card');
        if (card === null) return;
        card.classList.remove('hidden');
        card.classList.add('info-card');

        const wrapper = document.createElement('div');
        const title = wrapper.appendChild(document.createElement('h1'));
        title.innerHTML = projectTitle;
        wrapper.classList.add('wrapper');
        [...card.children].forEach(element => {
            wrapper.appendChild(element);
        });
        const text = wrapper.appendChild(document.createElement('p'));
        text.innerHTML = projectTitle + '\
        is an interactive digital art micro-project\
        by <a href=\"https://anatolyzenkov.com\">Anatoly Zenkov</a>.\
        It’s a part of the <a href=\"https://anatolyzenkov.com/code-art/">Code Art</a> project collection.\
        Source code is available on <a href=\"https://github.com/anatolyzenkov/code-art\">GitHub</a>.\
        ';
        const links = wrapper.appendChild(document.createElement('div'));
        links.classList.add('external-links');
        [
            {label: 'Twitter', url: 'https://twitter.com/anatolyzenkov'},
            {label: 'Instagram', url: 'https://www.instagram.com/anatolyzenkov.io/'},
            {label: 'TikTock', url: 'https://www.tiktok.com/@anatolyzenkov.io'},
        ].forEach(element => {
            const link = links.appendChild(document.createElement('a'));
            link.href = element.url;
            link.classList.add('link');
            link.innerHTML = element.label;
        });

        const navbar = card.appendChild(document.createElement('div'));
        navbar.classList.add('navbar');
        const userpic = navbar.appendChild(document.createElement('img'));
        userpic.src = '../../m/userpic.png';
        userpic.classList.add('userpic');
        const path = navbar.appendChild(document.createElement('div'));
        path.innerHTML = '\
        <a href=\"https://anatolyzenkov.com\">Anatoly Zenkov</a>\
        / <a href=\"https://anatolyzenkov.com/code-art/">Code Art</a>\
        ';
        path.classList.add('path');
        const button = document.body.appendChild(document.createElement('div'));
        button.id = 'nav-button';
        button.addEventListener('click', onClick);
        const buttonWrapper = button.appendChild(document.createElement('div'));
        buttonWrapper.classList.add('nav-button-wrapper');
        for (let i = 0; i < 5; i++) {
            const line = buttonWrapper.appendChild(document.createElement('div'));
            line.classList.add('line');
            line.classList.add('line'+i);
        }

        card.appendChild(wrapper);

        button.onmousemove = card.onmousemove = eventBlocker;
        button.ontouchmove = card.ontouchmove = eventBlocker;
        document.addEventListener('click', (e) => {
            if (!card.classList.contains('visible')) return;
            if (e.path !== undefined) {
                if (e.path.indexOf(card) === -1) {
                    onClick();
                }
            }
        });
    })();
});