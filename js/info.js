document.addEventListener("DOMContentLoaded", (event) => {
    (() => {
        const eventBlocker = (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
        }

        const onClick = (e) => {
            if (wrapper.classList.contains('hidden')) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }
            eventBlocker(e);
        }
        if (location.origin === 'file://') return;
        const backButton = document.createElement('a');
        backButton.classList.add('button', 'glyph-button', 'secondary', 'no-navbar-button', 'left');
        backButton.innerHTML ='<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">\
                                    <path d="M14 28L0 14L14 0" stroke-width="2"/>\
                                    <path d="M0 14L28 14" stroke-width="2"/>\
                                </svg>';
        backButton.href = "/codrt/";
        document.body.appendChild(backButton);
        const hamburgerButton = document.createElement('a');
        hamburgerButton.classList.add('button', 'glyph-button', 'secondary', 'no-navbar-button', 'right');
        hamburgerButton.innerHTML ='<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">\
                                        <path d="M0 0L28 1" stroke-width="2"/>\
                                        <path d="M0 29L28 29" stroke-width="2"/>\
                                        <path d="M0 15L28 15" stroke-width="2"/>\
                                    </svg>';
        hamburgerButton.onclick = onClick;
        document.body.appendChild(hamburgerButton);
        const projectTitle = document.title.split(' |')[0];
        const projectText = projectTitle + '\
        is an interactive digital art micro-project\
        by <a href=\"https://anatolyzenkov.com\">Anatoly Zenkov</a>.\
        It’s a part of the <a href=\"https://anatolyzenkov.com/code-art/">Codrt</a> project collection.\
        Source code is available on <a href=\"https://github.com/anatolyzenkov/code-art\">GitHub</a>.\
        ';
        const wrapper = document.createElement('div');
        wrapper.classList.add('modal-wrapper', 'hidden');
        wrapper.innerHTML = '\
        <nav class="nav-bar">\
            <div class="left nav-bar-section">\
                <div class="dummy"></div>\
            </div>\
            <div class="center nav-bar-section">\
            <a class="button glyph-button secondary" href="/">\
                <img class="userpic" src="/m/userpic.png" alt="Userpic">\
            </a>\
            </div>\
            <div class="right nav-bar-section">\
                <a id="close-button" class="button glyph-button secondary" alt="Close">\
                    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">\
                        <path d="M0 28L28 0" stroke-width="2"/>\
                        <path d="M0 0L28 28" stroke-width="2"/>\
                    </svg>\
                </a>\
            </div>\
        </nav>\
        <div class="section-group">\
            <section class="section">\
                <div class="backdrop" style="background-color: #ffffff;">\
                <div class="content">\
                    <h1 class="title">' + projectTitle + '</h1>\
                    <p class="text">' + projectText + '</p>\
                    <nav class="navigation button-group">\
                    <a class="button secondary" alt="Project on GitHub" href="https://github.com/anatolyzenkov/code-art/">GitHub</a>\
                    <a class="button secondary" alt="Follow Me on Instagram" href="https://www.instagram.com/anatolyzenkov.io/">Instagram</a>\
                    <a class="button secondary" alt="Follow Me on TikTok" href="https://vm.tiktok.com/ZMeqp5TNc/">Tiktok</a>\
                    </nav>\
                </div>\
            </section>\
        </div>\
        ';
        document.body.appendChild(wrapper);
        document.getElementById('close-button').onclick = onClick;
        wrapper.onmousemove = eventBlocker;
        wrapper.ontouchmove = eventBlocker;
    })();
});