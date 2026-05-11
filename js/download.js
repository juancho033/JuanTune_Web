(function () {
    'use strict';

    var tabs = document.querySelectorAll('.version-tab');
    var downloadBtn = document.querySelector('.platform-card.active .platform-btn');

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            if (this.disabled) return;
            tabs.forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            var version = this.getAttribute('data-version');
            if (downloadBtn) {
                downloadBtn.textContent = 'Descargar v' + version;
            }
            var tag = document.querySelector('.download-hero .tag');
            if (tag) {
                tag.textContent = 'v' + version;
            }
        });
    });

})();
