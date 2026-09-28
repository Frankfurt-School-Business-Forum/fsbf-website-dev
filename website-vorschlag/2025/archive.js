/*!
 * FS Business Forum – 2025 archive enhancements (/2025/)
 * ------------------------------------------------------
 * Loaded deferred AFTER ../script.js (shared with the 2026 home page, not modified here).
 * Only adds what the archive needs on top of it – every part is optional and fails silently:
 *   1. P2-9  failsafe if script.js did not start (no endless intro, working menu)
 *   2. P2-13 counters when the intro is skipped (script.js only animates them after the intro)
 *   3. P2-13 focus after "Skip intro"
 *   4. P2-5  modal mobile menu (inert background, focus in/out)
 *   5. P2-4  in-page links move focus + update the URL; deep links land on their section
 *   6. P2-2  back-to-top never covers the contact form or the footer
 *   7. P2-7  pause/play decorative motion (remembered per browser)
 *   0. A-3   no console noise from shared animations whose targets only exist on the home page
 * Vanilla ES5, no dependencies.
 */
(function (window, document) {
    'use strict';

    var root = document.documentElement;
    var body = document.body;
    var MOTION_KEY = 'fsbf-motion';
    var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var introMode = root.classList.contains('archive-intro');
    // script.js adds one of these synchronously right after it starts
    var scriptOk = body.classList.contains('intro-playing') || body.classList.contains('intro-complete');

    /* ---------- 0. A-3: quiet GSAP/ScrollTrigger null-target warnings ----------
     * After the intro, script.js' initAnimations() also animates home-only selectors (.hero-badge, .about-main,
     * .sponsor-wall, .team-photo-wrapper, .hero-video ...). On /2025/ they don't exist -> ~13 console warnings,
     * only on the first visit per tab. The tweens are harmless no-ops; both "GSAP target … not found" and
     * ScrollTrigger's "Element not found" honour this flag. Archive-only (this file is not loaded on /).
     * Cleaner long-term fix lives in script.js (guard each block with querySelector) - Track HOME. */
    if (window.gsap && typeof window.gsap.config === 'function') {
        window.gsap.config({ nullTargetWarn: false });
    }

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function readStore(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
    function writeStore(key, val) {
        try {
            if (val === null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, val);
        } catch (e) { /* private mode / blocked storage: preference is simply not remembered */ }
    }
    function focusNoScroll(el) {
        if (!el) return;
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }

    /* ---------- 1. P2-9: failsafe when script.js did not run ---------- */
    function fallbackMenu() {
        var btn = $('.nav-menu-btn');
        var menu = document.getElementById('mobileMenu');
        if (!btn || !menu) return;
        function set(open) {
            btn.classList.toggle('active', open);
            menu.classList.toggle('active', open);
            btn.setAttribute('aria-expanded', String(open));
            body.style.overflow = open ? 'hidden' : '';
        }
        btn.addEventListener('click', function () { set(!menu.classList.contains('active')); });
        $$('.mobile-link', menu).forEach(function (a) {
            a.addEventListener('click', function () { set(false); });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('active')) set(false);
        });
    }

    if (!scriptOk) {
        var deadOverlay = document.getElementById('introOverlay');
        if (deadOverlay && deadOverlay.parentNode) deadOverlay.parentNode.removeChild(deadOverlay);
        root.classList.remove('archive-intro');
        root.classList.add('archive-no-intro');
        introMode = false;
        body.classList.remove('intro-playing');
        body.classList.add('intro-complete');
        fallbackMenu();
    }

    /* ---------- 7 (early). P2-7: motion preference ---------- */
    var motionPaused = readStore(MOTION_KEY) === 'paused';

    /* ---------- 2. Counters ---------- */
    // Final values stay in the markup (no "0" without JS). script.js would only count them up
    // after the intro and leaves "0" wherever its scroll trigger has not fired yet -> the archive
    // takes the counters over (attribute renamed before script.js' endIntro() looks for it).
    var counters = $$('[data-count]');
    counters.forEach(function (c) {
        c.setAttribute('data-ar-count', c.getAttribute('data-count'));
        c.removeAttribute('data-count');
    });
    var countTarget = function (el) { return parseInt(el.getAttribute('data-ar-count'), 10) || 0; };
    var canCount = !REDUCED && !motionPaused && 'IntersectionObserver' in window && !!window.requestAnimationFrame;
    var countUp = function (el) {
        var target = countTarget(el);
        var start = null;
        var duration = target > 100 ? 1800 : 1200;
        var step = function (ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    };
    var watchCounters = function (zeroAll) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                countUp(entry.target);
            });
        }, { threshold: 0.5 });
        counters.forEach(function (c) {
            if (countTarget(c) < 3) return;
            var r = c.getBoundingClientRect();
            var painted = r.bottom > 0 && r.top < window.innerHeight;
            if (!zeroAll && painted) return; // already visible: keep the value, no 700 -> 0 flicker
            c.textContent = '0';
            io.observe(c);
        });
    };
    var overlay = document.getElementById('introOverlay');
    if (canCount) {
        if (introMode && scriptOk && overlay) {
            // hidden behind the intro: start at 0, count once the intro is over
            counters.forEach(function (c) { if (countTarget(c) >= 3) c.textContent = '0'; });
            onIntroEnd(function () { watchCounters(true); });
        } else {
            watchCounters(false);
        }
    }

    // Calls fn once when the intro overlay starts fading out or is removed
    function onIntroEnd(fn) {
        var done = false;
        var run = function () { if (!done) { done = true; fn(); } };
        if (!overlay || !('MutationObserver' in window)) { run(); return; }
        var mo = new MutationObserver(function () {
            if (overlay.classList.contains('fade-out') || !overlay.isConnected) { mo.disconnect(); run(); }
        });
        mo.observe(overlay, { attributes: true, attributeFilter: ['class'] });
        mo.observe(body, { childList: true });
    }

    /* ---------- 3. Focus after "Skip intro" ---------- */
    var main = document.getElementById('main');
    if (overlay && main && overlay.isConnected) {
        onIntroEnd(function () {
            // focus was on the skip button (keyboard / screen reader) -> continue at the content
            var active = document.activeElement;
            if (active && overlay.contains(active)) focusNoScroll(main);
        });
    }

    /* ---------- 4. P2-5: modal mobile menu ---------- */
    var menu = document.getElementById('mobileMenu');
    var toggle = $('.nav-menu-btn');
    if (menu && toggle && 'MutationObserver' in window) {
        var madeInert = [];
        var wasOpen = false;
        var setInert = function (el, on) {
            el.inert = on;
            if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
        };
        var menuMO = new MutationObserver(function () {
            var open = menu.classList.contains('active');
            if (open === wasOpen) return;
            wasOpen = open;
            if (open) {
                madeInert = Array.prototype.filter.call(body.children, function (el) {
                    return el !== menu && !el.classList.contains('nav') &&
                        el.tagName !== 'SCRIPT' && el.tagName !== 'TEMPLATE' && !el.hasAttribute('inert');
                });
                madeInert.forEach(function (el) { setInert(el, true); });
                window.setTimeout(function () { focusNoScroll($('a', menu)); }, 60);
            } else {
                madeInert.forEach(function (el) { setInert(el, false); });
                madeInert = [];
                var a = document.activeElement;
                if (!a || a === body || menu.contains(a)) focusNoScroll(toggle);
            }
        });
        menuMO.observe(menu, { attributes: true, attributeFilter: ['class'] });
    }

    /* ---------- 5. P2-4: in-page links (script.js scrolls smoothly but moves neither focus nor URL) ---------- */
    document.addEventListener('click', function (e) {
        var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!link || !e.defaultPrevented) return; // not handled by script.js -> native behaviour
        var hash = link.getAttribute('href');
        if (!hash || hash.length < 2) return;
        var target = document.getElementById(hash.slice(1));
        if (!target) return;
        if (window.history && history.pushState && window.location.hash !== hash) {
            try { history.pushState(null, '', hash); } catch (err) { /* file:// etc. */ }
        }
        var focusTarget = target === main ? main : (target.querySelector('h1, h2') || target);
        if (!focusTarget.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(focusTarget.tagName)) {
            focusTarget.setAttribute('tabindex', '-1');
        }
        focusNoScroll(focusTarget);
    });

    // Deep links (/2025/#speakers from the home page): land exactly on the section once layout is final
    if (window.location.hash && window.location.hash.length > 1) {
        window.addEventListener('load', function () {
            var t;
            try { t = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch (e) { t = null; }
            if (!t) return;
            window.requestAnimationFrame(function () {
                var nav = $('.nav');
                var offset = (nav ? nav.offsetHeight : 80) + 16;
                var y = t.getBoundingClientRect().top + window.pageYOffset - offset;
                if (Math.abs(window.pageYOffset - y) > 24) window.scrollTo(0, y);
            });
        });
    }

    /* ---------- 6. P2-2: back-to-top never covers the contact form or the footer ---------- */
    var btt = $('.back-to-top');
    var zones = [$('.contact-form-wrapper'), $('.footer')].filter(Boolean);
    if (btt && zones.length && 'IntersectionObserver' in window) {
        var zoneState = [];
        var zoneIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                zoneState[zones.indexOf(entry.target)] = entry.isIntersecting;
            });
            btt.classList.toggle('ar-btt-hidden', zoneState.some(Boolean));
        });
        zones.forEach(function (z) { zoneIO.observe(z); });
    }

    /* ---------- 7. P2-7: pause / play decorative motion ---------- */
    var motionBtn = $('.ar-motion-toggle');
    var pausedTweens = [];
    function applyMotion(paused, persist) {
        root.classList.toggle('motion-paused', paused);
        if (motionBtn) motionBtn.setAttribute('aria-pressed', String(paused));
        // endless GSAP loops (floating circles) – scroll-linked tweens are user driven and stay
        if (window.gsap && window.gsap.globalTimeline && window.gsap.globalTimeline.getChildren) {
            if (paused) {
                pausedTweens = window.gsap.globalTimeline.getChildren(true, true, false).filter(function (t) {
                    return typeof t.repeat === 'function' && t.repeat() === -1 && !t.paused();
                });
                pausedTweens.forEach(function (t) { t.pause(); });
            } else {
                pausedTweens.forEach(function (t) { t.resume(); });
                pausedTweens = [];
            }
        }
        if (persist) writeStore(MOTION_KEY, paused ? 'paused' : null);
    }
    if (motionPaused) applyMotion(true, false);
    if (motionBtn) {
        if (REDUCED) {
            // the OS already asked for reduced motion: nothing left to pause
            motionBtn.hidden = true;
        } else {
            motionBtn.addEventListener('click', function () {
                applyMotion(!root.classList.contains('motion-paused'), true);
            });
        }
    }
})(window, document);
