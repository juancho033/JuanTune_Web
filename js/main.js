(function () {
    'use strict';

    var track = document.querySelector('.slider-track');
    var slides = document.querySelectorAll('.slide');

    if (!track || slides.length === 0) return;

    var SLIDE_COUNT = slides.length;
    var VISIBLE = 19;
    var TRANSITION = 5;

    var step = 100 / SLIDE_COUNT;
    var kf = [];
    var pct = 0;

    kf.push({ pct: 0, y: 0 });
    pct += VISIBLE;
    kf.push({ pct: pct, y: 0 });

    for (var i = 1; i < SLIDE_COUNT; i++) {
        kf.push({ pct: pct, y: -(i - 1) * step });
        pct += TRANSITION;
        kf.push({ pct: pct, y: -i * step });

        if (i === SLIDE_COUNT - 1) {
            kf.push({ pct: pct, y: -i * step });
            kf.push({ pct: 100, y: -i * step });
        } else {
            kf.push({ pct: pct, y: -i * step });
            pct += VISIBLE;
            kf.push({ pct: pct, y: -i * step });
        }
    }

    var duration = 7900;

    var css = kf.map(function (k) {
        var p = k.pct > 100 ? 100 : k.pct;
        return p + '% { transform: translateY(' + k.y + '%); }';
    }).join('\n');

    var style = document.createElement('style');
    style.textContent = '@keyframes slide {\n' + css + '\n}';
    document.head.appendChild(style);
    track.style.animation = 'slide ' + duration + 'ms cubic-bezier(0.65, 0, 0.35, 1) infinite';

    var cards = document.querySelectorAll('.feature-card');
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.15 });

    cards.forEach(function (card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ' + (i * 0.12) + 's';
        observer.observe(card);
    });

    var modal = document.getElementById('modal-download');
    var openBtn = document.getElementById('btn-open-download');
    var closeBtn = document.getElementById('modal-close');

    function openModal() {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (modal && closeBtn) {
        if (openBtn) {
            openBtn.addEventListener('click', openModal);
        }

        var ctaBtns = document.querySelectorAll('.btn-open-download');
        for (var b = 0; b < ctaBtns.length; b++) {
            ctaBtns[b].addEventListener('click', openModal);
        }

        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

})();
