// ================================
// FS Business Forum - Premium Interactions
// Shared by the 2026 home page (index.html) and the 2025 archive (2025/index.html,
// which adds 2025/archive.js on top of this file).
//
// P2-9 robustness: the core features (reveal, menu, anchors, motion, video, sticky ticket
// bar, scrollspy, countdown) have NO library dependency, run first and each in its own
// try/catch. GSAP / ScrollTrigger / SplitType only add decorative polish at the very end
// and only if they actually loaded (the 2026 home page no longer loads them at all).
// ================================

// Global capability flags
const REDUCED_MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const REDUCED_MOTION = !!(REDUCED_MQ && REDUCED_MQ.matches);
const FINE_POINTER = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
const HAS_GSAP = typeof window.gsap !== 'undefined';
const HAS_SCROLLTRIGGER = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';

// Register GSAP plugins (P2-9: only when GSAP is there – a blocked file must not stop the page)
if (HAS_GSAP) {
    const gsapPlugins = [window.ScrollTrigger, window.ScrollToPlugin].filter(Boolean);
    if (gsapPlugins.length) gsap.registerPlugin(...gsapPlugins);
}

const root = document.documentElement;
const MOTION_KEY = 'fsbf-motion'; // same key as 2025/archive.js: one "pause motion" choice for the whole site

// P3-17 / P2-9: if the <head> failsafe already fell back to .no-js (slow network), JS is back now
root.classList.remove('no-js');
root.classList.add('js');

// ================================
// Small helpers
// ================================
function prefersReducedMotion() { return REDUCED_MQ ? REDUCED_MQ.matches : false; }
function motionPaused() { return root.classList.contains('motion-paused'); }
// true = decorative motion is welcome (no OS "reduce motion", not paused via the hero toggle)
function motionOK() { return !prefersReducedMotion() && !motionPaused(); }

function safeInit(name, fn) {
    try {
        fn();
    } catch (err) {
        if (window.console && console.error) console.error('[FSBF] ' + name + ' failed:', err);
    }
}

function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
}

function writeStore(key, value) {
    try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
    } catch (e) { /* private mode / blocked storage: the choice is simply not remembered */ }
}

function focusNoScroll(el) {
    if (!el || typeof el.focus !== 'function') return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
}

function onMediaChange(mq, fn) {
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
}

function isPlainClick(e) {
    return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function hashTarget(hash) {
    if (!hash || hash.charAt(0) !== '#' || hash.length < 2) return null;
    let id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { /* keep raw id */ }
    return document.getElementById(id);
}

// ================================
// Scrolling (P2-4)
// Anchor offset = scroll-padding-top from styles.css (nav height + 16 px), so CSS stays the
// single source of truth. Smooth only when motion is welcome – never for reduced motion.
// ================================
function anchorOffset() {
    const pad = parseFloat(window.getComputedStyle(root).scrollPaddingTop);
    if (pad > 0) return pad;
    const navEl = document.querySelector('.nav');
    return (navEl ? navEl.offsetHeight : 0) + 16;
}

function scrollToY(top, smooth) {
    top = Math.max(0, Math.round(top));
    if (smooth) {
        window.scrollTo({ top: top, behavior: 'smooth' });
        return;
    }
    // html:focus-within turns on smooth scrolling in CSS – force an instant jump here
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, top);
    root.style.scrollBehavior = prev;
}

// Document position of an element WITHOUT the reveal's translateY: a deep link that arrives while
// the section is still sliding in would otherwise land 26 px off.
function docTop(el) {
    let top = el.getBoundingClientRect().top + window.pageYOffset;
    const moving = el.closest('[data-reveal]');
    if (moving) {
        const m = /matrix(3d)?\(([^)]+)\)/.exec(window.getComputedStyle(moving).transform || '');
        if (m) {
            const v = m[2].split(',').map(parseFloat);
            top -= (m[1] ? v[13] : v[5]) || 0;
        }
    }
    return top;
}

function scrollToTarget(target, smooth) {
    scrollToY(docTop(target) - anchorOffset(), smooth);
}

// Minimal stand-in for the old Lenis smooth-scroll object (Lenis is not loaded on any page);
// the legacy intro code of the archive still calls lenis.stop()/start().
const lenis = {
    stop: () => {},
    start: () => {},
    scrollTo: (target) => {
        if (target === 0 || target === '0') { scrollToY(0, motionOK()); return; }
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (element) scrollToTarget(element, motionOK());
    }
};

// ================================
// 1 · Scroll reveal for [data-reveal] (P2-9)
// Runs first. The inline <head> snippet adds .has-js-reveal and removes it again if this
// never runs (script blocked / error / 2.5 s timeout) – content can never stay invisible.
// ================================
let revealObserver = null;

function revealAll() {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    if (revealObserver) {
        revealObserver.disconnect();
        revealObserver = null;
    }
}

// Position-independent reveal (IntersectionObserver instead of ScrollTrigger: nothing is
// cached against an unsettled layout, so it can never get "stuck").
function initVariantReveals() {
    window.__revealReady = true; // tells the <head> failsafe that the reveal logic is alive
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    // failsafe already fired, motion reduced/paused or no IO support: show everything now
    if (!root.classList.contains('has-js-reveal') || !motionOK() || !('IntersectionObserver' in window)) {
        revealAll();
        return;
    }

    revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                obs.unobserve(entry.target); // reveal once, then stop watching
            }
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(el => revealObserver.observe(el));
}

try {
    initVariantReveals();
} catch (err) {
    root.classList.remove('has-js-reveal'); // never leave content hidden
    if (window.console && console.error) console.error('[FSBF] reveal failed:', err);
}

// ================================
// 2 · Intro video (archive only)
// ================================
const introOverlay = document.getElementById('introOverlay');
const introVideo = document.getElementById('introVideo');
const introSkip = document.getElementById('introSkip');

safeInit('intro', () => {
    // Guarded: the 2026 home page ships WITHOUT the fullscreen intro overlay.
    if (!(introOverlay && introVideo)) {
        // No intro: mark the page as ready right away (2025/archive.js also reads this class).
        // P2-10: the home page's CSS keeps the hero static – no fade-out/fade-in flicker.
        document.body.classList.add('intro-complete');
        return;
    }

    // Add intro-playing class to body
    document.body.classList.add('intro-playing');

    // Disable scrolling during intro
    lenis.stop();

    // Reduced motion: skip the intro video entirely and reveal the page
    if (REDUCED_MOTION) {
        requestAnimationFrame(() => endIntro());
    }

    // Force video to load and start playing
    if (!REDUCED_MOTION) introVideo.load();

    // Handle video load error
    introVideo.addEventListener('error', () => {
        console.log('Video failed to load, skipping intro');
        endIntro();
    });

    // Try to play the video immediately when it can play
    introVideo.addEventListener('canplay', () => {
        introVideo.play().catch(e => {
            console.log('Autoplay failed:', e);
            endIntro();
        });
    }, { once: true });

    // Also try to play immediately
    if (!REDUCED_MOTION) {
        setTimeout(() => {
            introVideo.play().catch(() => {});
        }, 100);
    }

    // Fallback: if video doesn't start within 3 seconds, skip
    setTimeout(() => {
        if (!introOverlay.classList.contains('fade-out')) {
            if (introVideo.paused || introVideo.readyState < 2) {
                console.log('Video not playing, skipping intro');
                endIntro();
            }
        }
    }, 3000);

    // Handle video end
    introVideo.addEventListener('ended', () => {
        endIntro();
    });

    // Fallback: End intro after video duration + buffer (in case 'ended' event doesn't fire)
    introVideo.addEventListener('loadedmetadata', () => {
        const videoDuration = introVideo.duration;
        if (videoDuration && videoDuration > 0) {
            setTimeout(() => {
                if (!introOverlay.classList.contains('fade-out')) {
                    console.log('Video duration timeout - ending intro');
                    endIntro();
                }
            }, (videoDuration * 1000) + 2500); // Video duration + 2.5s buffer
        }
    });

    // Ultimate fallback: End intro after 8 seconds no matter what
    setTimeout(() => {
        if (!introOverlay.classList.contains('fade-out')) {
            console.log('Ultimate timeout - ending intro');
            endIntro();
        }
    }, 8000);

    // Skip button functionality
    if (introSkip) {
        introSkip.addEventListener('click', () => {
            endIntro();
        });
    }

    // Keyboard skip (Enter or Space)
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !introOverlay.classList.contains('fade-out')) {
            e.preventDefault();
            endIntro();
        }
    });
});

function endIntro() {
    if (introOverlay.classList.contains('fade-out')) return; // Prevent double trigger

    // Pre-initialize animations before visual transition
    safeInit('intro animations', initAnimations);

    // CRITICAL: Scrollen SYNCHRON wieder freigeben — NICHT in requestAnimationFrame.
    // rAF-Callbacks werden in Hintergrund-Tabs pausiert; der setTimeout unten aber
    // nicht. Lag das Entsperren im rAF, wurde das Overlay entfernt, waehrend
    // `intro-playing` (overflow:hidden) am <body> kleben blieb -> Seite dauerhaft
    // gesperrt ("haengt voellig"). Jetzt laeuft die Freigabe garantiert.
    document.body.classList.remove('intro-playing');
    document.body.classList.add('intro-complete');
    lenis.start();

    // Start the hero video (if the page has one) under the same rules as everywhere else
    syncHeroVideo();

    // Rein kosmetischer Fade-Uebergang — darf ruhig im rAF liegen.
    requestAnimationFrame(() => {
        introOverlay.classList.add('fade-out');
    });

    // Remove intro overlay from DOM after animation completes
    setTimeout(() => {
        introOverlay.remove();
    }, 1400);
}

// Sicherheitsnetz: Falls der Tab waehrend des Intros im Hintergrund war und ein
// exotischer Pfad das Entsperren doch verpasst, beim Zurueckkehren garantiert
// aufraeumen — die Seite darf NIE scroll-gesperrt zurueckbleiben.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.getElementById('introOverlay')) {
        document.body.classList.remove('intro-playing');
        document.body.classList.add('intro-complete');
    }
});

// ================================
// 3 · Navigation + modal mobile menu (P2-5)
// ================================
const nav = document.querySelector('.nav');
const navMenuBtn = document.querySelector('.nav-menu-btn');
const mobileMenu = document.getElementById('mobileMenu') || document.querySelector('.mobile-menu');
let menuInert = [];

function isMenuOpen() {
    return !!(mobileMenu && mobileMenu.classList.contains('active'));
}

function setInert(el, on) {
    el.inert = on;
    if (on) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
}

// Opens/closes the menu like a modal: everything behind it becomes inert (no tab stops, hidden
// from screen readers), focus moves to the first link and back to the toggle on close.
// The toggle keeps its fixed label "Menu" – aria-expanded carries the state.
function setMobileMenu(open, { restoreFocus = true } = {}) {
    if (!navMenuBtn || !mobileMenu || open === isMenuOpen()) return;

    navMenuBtn.classList.toggle('active', open);
    mobileMenu.classList.toggle('active', open);
    navMenuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
        // background = every <body> child except the header (logo + toggle) and the menu itself
        menuInert = Array.prototype.filter.call(document.body.children, el =>
            el !== mobileMenu && !el.contains(navMenuBtn) && !el.contains(mobileMenu) &&
            !/^(SCRIPT|TEMPLATE|STYLE|LINK|NOSCRIPT)$/.test(el.tagName) && !el.hasAttribute('inert'));
        menuInert.forEach(el => setInert(el, true));

        const first = mobileMenu.querySelector('a[href], button:not([disabled])');
        if (first) {
            focusNoScroll(first);
            // the menu fades in; retry once it is rendered if the first attempt did not stick
            if (document.activeElement !== first) {
                requestAnimationFrame(() => { if (isMenuOpen()) focusNoScroll(first); });
            }
        }
    } else {
        menuInert.forEach(el => setInert(el, false));
        menuInert = [];
        if (restoreFocus) focusNoScroll(navMenuBtn);
    }

    document.dispatchEvent(new CustomEvent('fsbf:menu', { detail: { open: open } }));
}

safeInit('mobile menu', () => {
    if (!navMenuBtn || !mobileMenu) return;

    navMenuBtn.addEventListener('click', () => {
        setMobileMenu(!isMenuOpen());
    });

    // Links inside the menu: in-page anchors are handled below (focus goes to the target);
    // everything else (2025 Recap, Get Tickets) closes the menu before the page changes.
    mobileMenu.addEventListener('click', (e) => {
        const link = e.target.closest ? e.target.closest('a[href]') : null;
        if (!link || !isPlainClick(e) || hashTarget(link.getAttribute('href'))) return;
        setMobileMenu(false);
    });

    // Escape closes and returns focus to the toggle
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen()) {
            setMobileMenu(false);
        }
    });

    // Resized to desktop while open (toggle hidden): never leave the page scroll-locked/inert
    let menuResizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(menuResizeTimer);
        menuResizeTimer = setTimeout(() => {
            if (isMenuOpen() && window.getComputedStyle(navMenuBtn).display === 'none') {
                setMobileMenu(false, { restoreFocus: false });
            }
        }, 150);
    });
});

// ================================
// 4 · In-page links + deep links (P2-4)
// ================================
function focusTargetFor(target) {
    if (target.hasAttribute('tabindex') || /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(target.tagName)) {
        return target;
    }
    const heading = target.querySelector('h1, h2, h3') || target;
    if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
        heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
    return heading;
}

safeInit('anchors', () => {
    const mainEl = document.getElementById('main');

    // Click on #links: scroll (smooth only if motion is welcome), new history entry, focus on
    // the target heading (tabindex=-1, preventScroll) so keyboard/screen-reader users continue there.
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || !isPlainClick(e)) return;
        const link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!link) return;
        const hash = link.getAttribute('href');
        const target = hashTarget(hash);
        if (!target) return;
        e.preventDefault();

        if (isMenuOpen() && mobileMenu.contains(link)) setMobileMenu(false, { restoreFocus: false });

        // History entry BEFORE scrolling: the current entry keeps the old position for "Back".
        // The skip link (#main) does not create an entry.
        if (target !== mainEl && window.location.hash !== hash && window.history && history.pushState) {
            try { history.pushState(null, '', hash); } catch (err) { /* file:// etc. */ }
        }
        scrollToTarget(target, motionOK());
        focusNoScroll(focusTargetFor(target));
    });

    // Fresh visit of /#tickets etc.: the browser jumps during parsing; once layout and fonts
    // are final we correct the position (instant) – unless the user already scrolled.
    if (window.location.hash.length > 1) {
        const navEntry = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
        if (navEntry && navEntry.type && navEntry.type !== 'navigate') return; // reload/back: keep the restored position

        let userMoved = false;
        const markMoved = () => { userMoved = true; };
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(type => {
            window.addEventListener(type, markMoved, { passive: true, once: true });
        });
        const land = () => {
            if (userMoved) return;
            const target = hashTarget(window.location.hash);
            if (!target) return;
            requestAnimationFrame(() => {
                if (userMoved) return;
                const y = Math.max(0, Math.round(docTop(target) - anchorOffset()));
                if (Math.abs(window.pageYOffset - y) > 2) scrollToY(y, false);
            });
        };
        if (document.readyState === 'complete') land();
        else window.addEventListener('load', land, { once: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(land);
    }
});

// ================================
// 5 · Hero video (P1-8)
// No autoplay attribute and preload="none": not a single video byte is requested until
// play() – and play() only happens after load/idle, when motion is welcome (no reduced
// motion, not paused), without Save-Data / 2G, while the hero is on screen and the tab visible.
// ================================
const heroVideo = document.querySelector('.hero-video');
let syncHeroVideo = () => {};

if (heroVideo) safeInit('hero video', () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    const saveData = () => !!conn && (!!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
    let ready = false;
    let inView = true;

    heroVideo.muted = true; // required for muted autoplay on iOS (attribute alone is not always reflected)

    syncHeroVideo = () => {
        const shouldPlay = ready && inView && motionOK() && !saveData() && document.visibilityState !== 'hidden';
        if (shouldPlay) {
            if (heroVideo.paused) {
                const p = heroVideo.play();
                if (p && typeof p.catch === 'function') p.catch(() => { /* blocked (e.g. low-power mode): poster stays */ });
            }
        } else if (!heroVideo.paused) {
            heroVideo.pause();
        }
    };

    // Pause outside the viewport
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach(entry => { inView = entry.isIntersecting; });
            syncHeroVideo();
        }, { threshold: 0.15 }).observe(heroVideo.closest('.hero') || heroVideo);
    }

    // Start only after the page (fonts, poster, above-the-fold images) has loaded, when idle
    const start = () => { ready = true; syncHeroVideo(); };
    const whenIdle = () => {
        if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 2500 });
        else setTimeout(start, 300);
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });

    document.addEventListener('visibilitychange', syncHeroVideo);
    onMediaChange(REDUCED_MQ, syncHeroVideo);
    if (conn && conn.addEventListener) conn.addEventListener('change', syncHeroVideo);
});

// ================================
// 6 · "Pause motion" toggle in the hero (P2-7, WCAG 2.2.2)
// html.motion-paused stops every CSS animation (styles.css), pauses the video, reveals all
// content at once, switches the countdown to minutes and anchor jumps to instant.
// The choice is remembered per browser (localStorage, same key as the archive); the <head>
// snippet applies it before the first paint.
// ================================
function applyMotionPaused(paused, persist) {
    root.classList.toggle('motion-paused', paused);
    const btn = document.querySelector('.motion-toggle');
    if (btn) {
        btn.setAttribute('aria-pressed', String(paused));
        // visible text stays consistent with the pressed state ("Motion paused" + pressed);
        // the icon switches in CSS via aria-pressed
        const label = btn.querySelector('.motion-toggle-label');
        if (label) label.textContent = paused ? 'Motion paused' : 'Pause motion';
    }
    if (paused) revealAll();
    syncHeroVideo();
    if (persist) writeStore(MOTION_KEY, paused ? 'paused' : null);
    document.dispatchEvent(new CustomEvent('fsbf:motion', { detail: { paused: paused } }));
}

safeInit('motion toggle', () => {
    const btn = document.querySelector('.motion-toggle');
    if (!btn) return;

    applyMotionPaused(motionPaused() || readStore(MOTION_KEY) === 'paused', false);

    // With "reduce motion" in the OS nothing moves anyway – the button would do nothing
    const syncVisibility = () => { btn.hidden = prefersReducedMotion(); };
    syncVisibility();
    onMediaChange(REDUCED_MQ, syncVisibility);

    btn.addEventListener('click', () => {
        applyMotionPaused(!motionPaused(), true);
    });
});

// ================================
// 7 · Sticky ticket bar below 900 px (P1-1)
// Visible whenever neither the hero's ticket button, nor a ticket card in #tickets, nor the footer
// is on screen – so a ticket CTA is always in reach, but not next to the big ones. The strip under
// the fixed header does not count as "on screen". Slide transition is off for reduced motion (CSS).
// ================================
safeInit('sticky ticket bar', () => {
    const bar = document.querySelector('.m-ticket-bar');
    if (!bar || !('IntersectionObserver' in window) || !window.matchMedia) return;

    const mq = window.matchMedia('(max-width: 899px)');
    const ticketCards = Array.from(document.querySelectorAll('#tickets .ticket-card'));
    const zones = [document.querySelector('#hero [data-ticket-link]') || document.getElementById('hero')]
        .concat(ticketCards.length ? ticketCards : [document.getElementById('tickets')])
        .concat(document.querySelector('.site-footer'))
        .filter(Boolean);
    const zonesInView = new Set();
    const navHeight = nav ? Math.round(nav.offsetHeight) : 0;

    const update = () => {
        const visible = mq.matches && zones.length > 0 && zonesInView.size === 0 && !isMenuOpen();
        bar.classList.toggle('is-visible', visible);
        // while the bar is shown, keyboard focus scrolls elements clear of it (WCAG 2.4.11)
        root.classList.toggle('has-m-ticket', visible);
    };

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) zonesInView.add(entry.target);
            else zonesInView.delete(entry.target);
        });
        update();
    }, { rootMargin: '-' + navHeight + 'px 0px 0px 0px' });
    zones.forEach(zone => io.observe(zone));

    // no initial update(): before the observer's first callback no zone is known yet and the bar
    // would flash up on page load – the first callback (right after observe) sets the real state
    onMediaChange(mq, update);
    document.addEventListener('fsbf:menu', update);
});

// ================================
// 8 · Scrollspy (P3-12): aria-current on the nav link of the section in the reading band
// ================================
safeInit('scrollspy', () => {
    if (!('IntersectionObserver' in window)) return;
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"], .mobile-menu a[href^="#"]'));
    const sections = new Map(); // section element -> its links (in nav order)
    links.forEach(link => {
        const section = hashTarget(link.getAttribute('href'));
        if (!section) return;
        if (!sections.has(section)) sections.set(section, []);
        sections.get(section).push(link);
    });
    if (!sections.size) return;

    const inBand = new Set();
    let current = null;
    const setCurrent = (section) => {
        if (section === current) return;
        current = section;
        links.forEach(link => link.removeAttribute('aria-current'));
        if (section) sections.get(section).forEach(link => link.setAttribute('aria-current', 'true'));
    };

    // reading band at 40–45 % of the viewport height; sections without a nav link clear the state
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) inBand.add(entry.target);
            else inBand.delete(entry.target);
        });
        let next = null;
        sections.forEach((_, section) => { if (!next && inBand.has(section)) next = section; });
        setCurrent(next);
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach((_, section) => io.observe(section));
});

// ================================
// Date helpers for the countdown and "days to go"
// Times should carry an explicit offset, e.g. 2026-11-13T09:00:00+01:00 (CET, from 25 Oct 2026)
// or …+02:00 (CEST). A value WITHOUT offset is read as Europe/Berlin wall-clock time – never in
// the visitor's own time zone. TODO(Team): always add the offset when changing data-target.
// ================================
let berlinFormat = null;

function berlinParts(ms) {
    if (!berlinFormat) {
        berlinFormat = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Berlin', hourCycle: 'h23',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric'
        });
    }
    const p = {};
    berlinFormat.formatToParts(new Date(ms)).forEach(part => { p[part.type] = part.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

function berlinOffsetMs(ms) {
    const p = berlinParts(ms);
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - (ms - (ms % 1000));
}

function parseEventTime(value) {
    const str = String(value || '').trim();
    if (!str) return NaN;
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) return Date.parse(str);
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(str);
    if (!m) return Date.parse(str);
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    try {
        // Berlin is UTC+1 or UTC+2; the second pass settles the DST switch days
        const first = wall - berlinOffsetMs(wall);
        return wall - berlinOffsetMs(first);
    } catch (err) {
        return Date.parse(str); // no Intl time-zone support: visitor's local time as last resort
    }
}

// Calendar day number in Frankfurt (for "N days to go" – independent of the time of day)
function berlinDayNumber(ms) {
    try {
        const p = berlinParts(ms);
        return Date.UTC(p.y, p.mo - 1, p.d) / 86400000;
    } catch (err) {
        const d = new Date(ms);
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    }
}

// ================================
// 9 · Speaker-reveal countdown (P0-3)
// data-target is maintained by the team (not changed here). Expired or invalid target: the
// digits stay hidden and the neutral line shows – never "00 : 00 : 00 : 00" or "right now".
// Screen readers get one calm sr-only summary (role=timer, aria-live=off) instead of the
// ticking digits; with paused/reduced motion it ticks per minute and hides the seconds.
// ================================
safeInit('countdown', () => {
    const el = document.getElementById('speakerCountdown');
    if (!el) return;
    const live = el.closest('.countdown-live');
    const box = el.closest('.speaker-countdown') || el.parentElement;
    const fallback = box.querySelector('.countdown-fallback');
    const summary = box.querySelector('.countdown-sr');
    const target = parseEventTime(el.getAttribute('data-target'));

    const nums = {};
    el.querySelectorAll('[data-cd]').forEach(n => { nums[n.getAttribute('data-cd')] = n; });
    const secUnit = nums.seconds ? nums.seconds.closest('.countdown-unit') : null;
    const secSep = secUnit && secUnit.previousElementSibling && secUnit.previousElementSibling.classList.contains('countdown-sep')
        ? secUnit.previousElementSibling : null;

    let timer = null;
    let lastSummary = '';

    const showFallback = () => {
        if (timer) clearInterval(timer);
        timer = null;
        if (live) live.hidden = true;
        if (fallback) fallback.hidden = false;
    };

    if (!live || !nums.days || !(target > Date.now())) {
        showFallback();
        return;
    }

    const pad = (n) => (n < 10 ? '0' : '') + n;
    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

    const tick = () => {
        const diff = target - Date.now();
        if (diff <= 0) { showFallback(); return; }
        const s = Math.floor(diff / 1000);
        const days = Math.floor(s / 86400);
        const hours = Math.floor((s % 86400) / 3600);
        nums.days.textContent = pad(days);
        if (nums.hours) nums.hours.textContent = pad(hours);
        if (nums.minutes) nums.minutes.textContent = pad(Math.floor((s % 3600) / 60));
        if (nums.seconds) nums.seconds.textContent = pad(s % 60);
        // rounded like people say it: 2 d 23 h -> "in 3 days", 5 h 40 min -> "in 6 hours"
        const text = 'Next speaker reveal in ' +
            (s >= 86400 ? plural(Math.round(s / 86400), 'day')
                : s >= 3600 ? plural(Math.round(s / 3600), 'hour') : 'less than an hour');
        if (summary && text !== lastSummary) {
            summary.textContent = text;
            lastSummary = text;
        }
    };

    // Ein tickender Countdown ist keine Animation: er laeuft immer sekuendlich und mit Sekunden
    // (vorher bei "Bewegung reduzieren"/"Pause motion" nur alle 30 s -> wirkte eingefroren).
    const schedule = () => {
        if (secUnit) secUnit.hidden = false;
        if (secSep) secSep.hidden = false;
        if (timer) clearInterval(timer);
        tick();
        if (target > Date.now()) timer = setInterval(tick, 1000);
    };

    live.hidden = false;
    if (fallback) fallback.hidden = true;
    schedule();

    document.addEventListener('fsbf:motion', schedule);
    onMediaChange(REDUCED_MQ, schedule);
    // background tabs throttle intervals: re-sync as soon as the tab is visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && timer) tick();
    });
});

// ================================
// 10 · "N days to go" next to the tickets (P2-15)
// Static fallback text in the HTML (date only); hidden once the event has started.
// ================================
safeInit('days to go', () => {
    const el = document.querySelector('.days-to-go[data-event-start]');
    if (!el) return;
    const start = parseEventTime(el.getAttribute('data-event-start'));
    if (!(start > 0)) return; // invalid date: keep the static text
    const dates = el.textContent.trim(); // e.g. "13–14 November 2026"

    let timer = null;
    const render = () => {
        const now = Date.now();
        if (now >= start) {
            el.hidden = true;
            if (timer) clearInterval(timer);
            timer = null;
            return;
        }
        const days = berlinDayNumber(start) - berlinDayNumber(now);
        const lead = days > 1 ? days + ' days to go' : days === 1 ? '1 day to go' : 'Starts today';
        const text = lead + ' · ' + dates;
        if (el.textContent !== text) el.textContent = text;
        el.hidden = false;
    };
    render();
    // pages left open overnight / over the start time stay correct (text only changes at midnight)
    if (!el.hidden) timer = setInterval(render, 60000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') render();
    });
});

// ================================
// 11 · Back to top + consolidated scroll handler
// (one passive, rAF-throttled listener: nav .scrolled, progress bar, back-to-top).
// P3-4: the old hide-on-scroll of the header is gone – it stays visible with "Get Tickets".
// ================================
const backToTopBtn = document.querySelector('.back-to-top');
const scrollProgressBar = document.querySelector('.scroll-progress');

safeInit('back to top', () => {
    if (!backToTopBtn) return;
    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToY(0, motionOK());
        // keyboard activation (detail 0): continue at the top instead of on the now hidden button
        if (e.detail === 0) focusNoScroll(document.querySelector('.nav-logo'));
    });
});

let scrollTicking = false;

function onGlobalScroll() {
    scrollTicking = false;
    // read first …
    const y = window.pageYOffset || root.scrollTop;
    const docHeight = scrollProgressBar ? root.scrollHeight - window.innerHeight : 0;
    // … then write
    if (nav) nav.classList.toggle('scrolled', y > 100);
    if (scrollProgressBar) {
        const progress = docHeight > 0 ? Math.min(y / docHeight, 1) : 0;
        scrollProgressBar.style.transform = 'scaleX(' + progress + ')';
    }
    if (backToTopBtn) backToTopBtn.classList.toggle('visible', y > 500);
}

window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(onGlobalScroll);
}, { passive: true });
safeInit('scroll state', onGlobalScroll);

// ================================
// 12 · Show more speakers (archive)
// ================================
safeInit('show more speakers', () => {
    const showMoreBtn = document.getElementById('showMoreSpeakers');
    const showMoreContainer = document.querySelector('.show-more-btn');
    if (!showMoreBtn) return;
    if (document.querySelectorAll('.speaker-card-hidden').length === 0) {
        if (showMoreContainer) showMoreContainer.style.display = 'none';
        return;
    }

    showMoreBtn.addEventListener('click', () => {
        // Get all hidden speaker cards
        const hiddenSpeakers = document.querySelectorAll('.speaker-card-hidden');
        if (!hiddenSpeakers.length) return;

        if (!HAS_GSAP || !motionOK()) {
            // Instant reveal, no tweens
            if (showMoreContainer) showMoreContainer.classList.add('hidden');
            hiddenSpeakers.forEach(speaker => {
                speaker.classList.remove('speaker-card-hidden');
                speaker.classList.add('speaker-card-visible');
                speaker.style.display = 'block';
            });
            return;
        }

        // Animate button out
        gsap.to(showMoreContainer, {
            opacity: 0,
            scale: 0.9,
            duration: 0.4,
            ease: 'power2.in',
            onComplete: () => {
                showMoreContainer.classList.add('hidden');
            }
        });

        // Reveal speakers with staggered animation
        hiddenSpeakers.forEach((speaker, index) => {
            speaker.classList.remove('speaker-card-hidden');
            speaker.classList.add('speaker-card-visible');
            speaker.style.display = 'block';

            gsap.fromTo(speaker,
                { opacity: 0, y: 30, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.6,
                    delay: 0.3 + (index * 0.08), // Stagger delay
                    ease: 'power3.out',
                    onComplete: () => {
                        // Clear inline styles after animation
                        speaker.style.opacity = '';
                        speaker.style.transform = '';
                    }
                }
            );
        });
    });
});

// ================================
// GSAP-dependent polish (archive only) – everything below needs GSAP (P2-9 guard)
// ================================

// Initialize Animations (called from endIntro on the archive)
function initAnimations() {
    // Reduced motion or no GSAP: no tweens; CSS overrides reveal the content, counters get final values
    if (REDUCED_MOTION || !HAS_SCROLLTRIGGER) {
        document.querySelectorAll('[data-count]').forEach(counter => {
            counter.innerHTML = counter.getAttribute('data-count');
        });
        return;
    }

    // Hero animations
    const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    heroTl
        .to('.hero-badge', { opacity: 1, y: 0, duration: 0.8 })
        .to('.title-line', { opacity: 1, y: 0, duration: 1, stagger: 0.15 }, '-=0.4')
        .to('.hero-date', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .to('.hero-description', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .to('.hero-stats', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
        .to('.hero-cta', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
        .to('.hero-scroll', { opacity: 1, duration: 0.8 }, '-=0.3');

    // Animate stat numbers
    animateCounters();

    // Section animations
    initSectionAnimations();

    // Parallax effects
    initParallax();

    // Gallery animations
    initGalleryAnimations();
}

// ================================
// Counter Animation
// ================================
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const isYear = target > 1000;

        ScrollTrigger.create({
            trigger: counter,
            start: 'top 80%',
            onEnter: () => {
                gsap.to(counter, {
                    innerHTML: target,
                    duration: isYear ? 0.5 : 2.5,
                    ease: 'power2.out',
                    snap: { innerHTML: 1 },
                    onUpdate: function() {
                        counter.innerHTML = Math.round(this.targets()[0].innerHTML);
                    }
                });
            },
            once: true
        });
    });
}

// ================================
// Section Animations
// ================================
function initSectionAnimations() {
    // About section
    gsap.from('.about .section-tag', {
        scrollTrigger: {
            trigger: '.about',
            start: 'top 70%',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
    });

    gsap.from('.about .title-reveal', {
        scrollTrigger: {
            trigger: '.about .section-title',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    gsap.from('.about-lead', {
        scrollTrigger: {
            trigger: '.about-main',
            start: 'top 70%',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out'
    });

    gsap.from('.about-text', {
        scrollTrigger: {
            trigger: '.about-main',
            start: 'top 60%',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
    });

    // Features
    gsap.from('.feature', {
        scrollTrigger: {
            trigger: '.about-features',
            start: 'top 70%',
        },
        opacity: 0,
        y: 60,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out'
    });

    // Speakers section
    gsap.from('.speakers .section-tag', {
        scrollTrigger: {
            trigger: '.speakers',
            start: 'top 70%',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
    });

    gsap.from('.speakers .title-reveal', {
        scrollTrigger: {
            trigger: '.speakers .section-title',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    gsap.from('.speakers .section-subtitle', {
        scrollTrigger: {
            trigger: '.speakers .section-header',
            start: 'top 75%',
        },
        opacity: 0,
        y: 40,
        duration: 1,
        delay: 0.4,
        ease: 'power3.out'
    });

    // Speaker cards - optimized for performance
    gsap.from('.speaker-card', {
        scrollTrigger: {
            trigger: '.speakers-grid',
            start: 'top 75%',
        },
        opacity: 0,
        y: 40,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
        force3D: true
    });

    // Experience section
    gsap.from('.experience .section-tag', {
        scrollTrigger: {
            trigger: '.experience',
            start: 'top 70%',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
    });

    gsap.from('.experience .title-reveal', {
        scrollTrigger: {
            trigger: '.experience .section-title',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    // Partners section
    gsap.from('.partners .title-reveal', {
        scrollTrigger: {
            trigger: '.partners',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    // Partner logos - fade in with stagger
    gsap.from('.sponsor-card', {
        scrollTrigger: {
            trigger: '.sponsor-wall',
            start: 'top 85%',
        },
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        force3D: true
    });

    // Stats section
    gsap.from('.stat-item', {
        scrollTrigger: {
            trigger: '.stats-section',
            start: 'top 70%',
        },
        opacity: 0,
        y: 60,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
    });

    // Contact section
    gsap.from('.contact-content > *', {
        scrollTrigger: {
            trigger: '.contact',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out'
    });

    // Speaker Highlight Cards - animated entrance
    gsap.from('.speaker-highlight-card', {
        scrollTrigger: {
            trigger: '.speaker-highlights',
            start: 'top 80%',
        },
        opacity: 0,
        y: 80,
        scale: 0.9,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
    });

    // About Photo Grid - smooth reveal
    gsap.from('.about-photo-grid .photo-grid-item', {
        scrollTrigger: {
            trigger: '.about-photo-grid',
            start: 'top 85%',
        },
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        force3D: true
    });

    // Panel Highlights - each panel animates separately
    gsap.utils.toArray('.panel-highlight').forEach((panel) => {
        const content = panel.querySelector('.panel-content');
        const isReverse = panel.classList.contains('reverse');

        gsap.from(content, {
            scrollTrigger: {
                trigger: panel,
                start: 'top 80%',
            },
            opacity: 0,
            x: isReverse ? -50 : 50,
            duration: 1,
            ease: 'power3.out'
        });
    });

    // Team Section
    gsap.from('.team .title-reveal', {
        scrollTrigger: {
            trigger: '.team',
            start: 'top 70%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    gsap.from('.team-photo-wrapper', {
        scrollTrigger: {
            trigger: '.team-photo-wrapper',
            start: 'top 70%',
        },
        opacity: 0,
        y: 60,
        scale: 0.95,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.chairman-card', {
        scrollTrigger: {
            trigger: '.chairmen-grid',
            start: 'top 80%',
        },
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out'
    });

    gsap.from('.team-departments span', {
        scrollTrigger: {
            trigger: '.team-departments',
            start: 'top 85%',
        },
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out'
    });
}

// ================================
// Parallax Effects
// ================================
function initParallax() {
    // Hero parallax - disabled on mobile to prevent black gap on scroll-to-top
    if (window.innerWidth > 768) {
        gsap.to('.hero-video', {
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            y: 200,
            scale: 1.1
        });
    }

    gsap.to('.hero-content', {
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        },
        y: 100,
        opacity: 0
    });

    // Panel highlights parallax (multiple panels)
    gsap.utils.toArray('.panel-highlight').forEach((panel) => {
        const bgImg = panel.querySelector('.panel-bg img');
        if (bgImg) {
            gsap.to(bgImg, {
                scrollTrigger: {
                    trigger: panel,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                },
                y: -80,
                scale: 1.1
            });
        }
    });

    // About photo grid parallax
    gsap.to('.about-photo-grid .photo-grid-item.main img', {
        scrollTrigger: {
            trigger: '.about-photo-grid',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
        },
        y: -30,
    });

    // Stats background text
    gsap.to('.stats-bg-text', {
        scrollTrigger: {
            trigger: '.stats-section',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
        },
        x: -100,
    });

    // Gallery items parallax
    document.querySelectorAll('.gallery-item').forEach(item => {
        const speed = parseFloat(item.getAttribute('data-speed')) || 1;
        const yOffset = (speed - 1) * 100;

        gsap.to(item, {
            scrollTrigger: {
                trigger: item,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1
            },
            y: yOffset
        });
    });
}

// ================================
// Gallery Animations
// ================================
function initGalleryAnimations() {
    gsap.from('.gallery-item', {
        scrollTrigger: {
            trigger: '.experience-gallery',
            start: 'top 70%',
        },
        opacity: 0,
        y: 100,
        scale: 0.95,
        duration: 0.8,
        stagger: {
            amount: 0.6,
            grid: 'auto',
            from: 'start'
        },
        ease: 'power3.out'
    });
}

if (HAS_GSAP) safeInit('gsap polish', () => {
    // ================================
    // Magnetic Effect for Buttons + Speaker Card 3D Tilt (fine pointer only)
    // ================================
    if (FINE_POINTER && !REDUCED_MOTION) {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                if (motionPaused()) return;
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                gsap.to(btn, {
                    x: x * 0.2,
                    y: y * 0.2,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        });

        document.querySelectorAll('.speaker-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (motionPaused()) return;
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;

                gsap.to(card, {
                    rotateY: x * 10,
                    rotateX: -y * 10,
                    duration: 0.3,
                    ease: 'power2.out',
                    transformPerspective: 1000
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateY: 0,
                    rotateX: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });
        });
    }

    if (!HAS_SCROLLTRIGGER) return;

    // Resize Handler
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            ScrollTrigger.refresh();
        }, 250);
    });

    // SplitType Text Animations
    if (typeof SplitType !== 'undefined' && !REDUCED_MOTION) {
        // Animate section titles with character reveal
        document.querySelectorAll('.title-reveal').forEach(title => {
            const split = new SplitType(title, { types: 'chars, words' });

            gsap.from(split.chars, {
                scrollTrigger: {
                    trigger: title,
                    start: 'top 85%',
                    once: true
                },
                opacity: 0,
                y: 50,
                rotateX: -90,
                stagger: 0.02,
                duration: 0.8,
                ease: 'back.out(1.7)'
            });
        });
    }

    if (REDUCED_MOTION) return;

    // Enhanced Parallax Images - reduced movement to prevent black space
    document.querySelectorAll('.gallery-item img').forEach(img => {
        gsap.to(img, {
            scrollTrigger: {
                trigger: img.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5
            },
            y: -15,
            scale: 1.03,
            ease: 'none'
        });
    });

    // Floating Elements Animation
    document.querySelectorAll('.visual-circle').forEach((circle, i) => {
        gsap.to(circle, {
            y: -30 - (i * 10),
            x: 20 + (i * 5),
            rotation: 360,
            duration: 20 + (i * 5),
            repeat: -1,
            ease: 'none'
        });
    });

    // Enhanced Section Reveals - only for sections AFTER hero (excluding about/speakers which have their own animations)
    document.querySelectorAll('section:not(.hero):not(.speakers):not(.about)').forEach(section => {
        const elements = section.querySelectorAll('.section-tag, .section-subtitle');

        if (elements.length > 0) {
            gsap.from(elements, {
                scrollTrigger: {
                    trigger: section,
                    start: 'top 75%',
                    once: true
                },
                opacity: 0,
                y: 40,
                stagger: 0.1,
                duration: 0.8,
                ease: 'power3.out'
            });
        }
    });

    // Smooth Scale Effect for Panel Highlights only (headline speakers appear immediately)
    document.querySelectorAll('.panel-highlight').forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                once: true
            },
            scale: 0.9,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        });
    });

    // Add smooth entrance for chairman cards
    document.querySelectorAll('.chairman-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                once: true
            },
            opacity: 0,
            y: 80,
            rotateY: 15,
            duration: 1,
            delay: i * 0.15,
            ease: 'power3.out'
        });
    });

    // Footer reveal animation (archive .footer; the home page uses .site-footer on purpose)
    const footer = document.querySelector('.footer');
    if (footer) {
        gsap.from(footer.children, {
            scrollTrigger: {
                trigger: footer,
                start: 'top 90%',
                once: true
            },
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.8,
            ease: 'power3.out'
        });
    }
});

// ================================
// Corporate-Partner: Karte klappt darunter ein Detail-Panel auf (ein Panel pro Tier offen), Sprachwahl EN/DE per Flagge
// ================================
safeInit('partner details', () => {
    const toggles = Array.from(document.querySelectorAll('.pcard--toggle[aria-controls]'));
    if (!toggles.length) return;
    const panelOf = btn => document.getElementById(btn.getAttribute('aria-controls'));

    function setOpen(btn, open) {
        const panel = panelOf(btn);
        btn.setAttribute('aria-expanded', String(open));
        if (panel) panel.hidden = !open;
        if (open && window.fsbfTrack) window.fsbfTrack('Partner details', { partner: btn.id.replace(/^pb-/, '') });
    }

    toggles.forEach(btn => {
        const panel = panelOf(btn);
        if (!panel) return;
        btn.addEventListener('click', () => {
            const willOpen = btn.getAttribute('aria-expanded') !== 'true';
            const tier = btn.closest('.ptier');
            if (tier) tier.querySelectorAll('.pcard--toggle[aria-expanded="true"]').forEach(o => { if (o !== btn) setOpen(o, false); });
            setOpen(btn, willOpen);
            if (willOpen) panel.scrollIntoView({ block: 'nearest', behavior: motionOK() ? 'smooth' : 'auto' });
        });
        const close = panel.querySelector('.pdetail-close');
        if (close) close.addEventListener('click', () => { setOpen(btn, false); btn.focus(); });
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { setOpen(btn, false); btn.focus(); }
        });
    });

    // Links wie "the companies of Schwarz Group" im Workshop-Block oeffnen direkt das passende Panel
    document.querySelectorAll('[data-open-partner]').forEach(link => {
        link.addEventListener('click', (e) => {
            const btn = document.getElementById(link.getAttribute('data-open-partner'));
            if (!btn) return;
            e.preventDefault();
            if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
            btn.scrollIntoView({ block: 'start', behavior: motionOK() ? 'smooth' : 'auto' });
            btn.focus({ preventScroll: true });
        });
    });

    document.querySelectorAll('.pdetail').forEach(panel => {
        const langBtns = Array.from(panel.querySelectorAll('[data-lang-btn]'));
        langBtns.forEach(b => b.addEventListener('click', () => {
            const lang = b.getAttribute('data-lang-btn');
            langBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            panel.querySelectorAll('.pdetail-text[data-lang]').forEach(t => { t.hidden = t.getAttribute('data-lang') !== lang; });
        }));
    });
});

// ================================
// Aftermovie: YouTube erst nach Klick laden (youtube-nocookie.com), vorher nur das lokale Vorschaubild
// ================================
safeInit('aftermovie', () => {
    document.querySelectorAll('.yt-facade[data-yt-id]').forEach(box => {
        const link = box.querySelector('.yt-play');
        if (!link) return;
        link.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   // new tab etc. -> normal link
            e.preventDefault();
            const id = encodeURIComponent(box.dataset.ytId);
            const iframe = document.createElement('iframe');
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
            iframe.title = 'Aftermovie 2025 | FS Business Forum';
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            box.classList.add('is-playing');
            box.replaceChildren(iframe);
            iframe.focus();
        });
    });
});

console.log('%c FS Business Forum — we warmly welcome you in November :) ', 'background: #c9a962; color: #040810; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
