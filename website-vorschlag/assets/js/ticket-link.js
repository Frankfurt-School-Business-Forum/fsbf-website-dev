/*!
 * FS Business Forum 2026 – zentrale Ticket-Link-Konfiguration
 * ------------------------------------------------------------
 * Eine Stelle fuer die ganze Site (Startseite, Archiv, tickets.html, Rechtsseiten, 404 …).
 *
 * Markup-Vertrag:
 *   <a href="tickets.html" data-ticket-link data-cta="hero">Get Tickets</a>
 *   - href        = No-JS-Fallback (tickets.html bzw. ../tickets.html im Archiv)
 *   - data-cta    = Ort des CTAs (hero|nav|menu|jump|band|sticky|pricing-1|footer|404|legal|tickets-page …)
 *
 * Ist TICKET_URL gesetzt, zeigen alle [data-ticket-link] direkt auf Eventbrite
 * (gleicher Tab) – mit ?aff=<data-cta> als Eventbrite-Tracking-Code (P0-1, P2-3, P2-14).
 * Zusaetzlich: <html data-tickets-live="true"> fuer CSS/Seitenzustaende (tickets.html).
 *
 * Workshop-Bewerbung (gleiches Prinzip):
 *   <a data-workshop-link data-cta="workshops" data-label-live="Apply now" aria-disabled="true">Applications open soon</a>
 *   - ohne href/mit aria-disabled = Zustand "kommt bald" (auch ohne JS)
 *   - ist WORKSHOP_URL gesetzt: href = WORKSHOP_URL, Text = data-label-live, <html data-workshops-live="true">
 *
 * Einbinden:  <script defer src="assets/js/ticket-link.js?v=20260928c"></script>
 * Vanilla ES5, keine Abhaengigkeiten, fehlerfrei auch ohne passende Links.
 */
(function (window, document) {
    'use strict';

    // Vollstaendige URL inkl. https:// (sonst wird sie ignoriert und alle Links bleiben bei tickets.html).
    var TICKET_URL = 'https://www.eventbrite.de/e/fs-business-forum-2026-tickets-1993516652973'; // Eventbrite, Verkauf seit 28.09.2026

    // Bewerbungsseite fuer Workshops, Alumni Roundtable, Coffee Chats, Wine Tasting (vollstaendige URL inkl. https://).
    // Leer = "Applications open soon" auf der ganzen Site.
    var WORKSHOP_URL = ''; // TODO(Launch): URL der Workshop-Bewerbung eintragen, sobald die Seite existiert

    /* P2-14: eingehende utm_*-Parameter (Kampagnen-Links) an den Shop durchreichen.
       Nur Parameter der aktuellen Seite, kein Speichern (keine Cookies/Storage). */
    var PASS_UTM = true;

    var root = document.documentElement;
    var live = typeof TICKET_URL === 'string' && /^https?:\/\//i.test(TICKET_URL);

    if (live) {
        root.setAttribute('data-tickets-live', 'true'); // == html.dataset.ticketsLive = 'true'
    }

    var workshopsLive = typeof WORKSHOP_URL === 'string' && /^https?:\/\//i.test(WORKSHOP_URL);
    if (workshopsLive) root.setAttribute('data-workshops-live', 'true');

    function activateWorkshopLinks() {
        if (!workshopsLive) return;
        var list = document.querySelectorAll('[data-workshop-link]');
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            el.setAttribute('href', WORKSHOP_URL);
            el.removeAttribute('aria-disabled');
            var label = el.getAttribute('data-label-live');
            var slot = el.querySelector('.ws-label') || el;
            if (label) slot.textContent = label;
        }
    }

    function getCta(el) {
        return (el && el.getAttribute('data-cta')) || 'site';
    }

    function utmSuffix() {
        if (!PASS_UTM) return '';
        var out = [];
        var query = (window.location && window.location.search) || '';
        var re = /[?&](utm_(?:source|medium|campaign|content|term))=([^&#]*)/gi;
        var m;
        while ((m = re.exec(query)) !== null) {
            if (TICKET_URL.indexOf(m[1] + '=') === -1) out.push(m[1].toLowerCase() + '=' + m[2]);
        }
        return out.length ? '&' + out.join('&') : '';
    }

    /** Ziel-URL fuer einen CTA-Ort (auch fuer andere Skripte nutzbar). */
    function ticketHref(cta) {
        if (!live) return null;
        return TICKET_URL +
            (TICKET_URL.indexOf('?') > -1 ? '&' : '?') +
            'aff=' + encodeURIComponent(cta || 'site') +
            utmSuffix();
    }

    function rewrite(el) {
        if (!live || !el || !el.setAttribute) return;
        var href = ticketHref(getCta(el));
        if (el.getAttribute('href') !== href) el.setAttribute('href', href);
        // gleicher Tab: Eventbrite ersetzt die Seite, kein neues Fenster
        if (el.getAttribute('target') === '_blank') el.removeAttribute('target');
    }

    function rewriteAll(scope) {
        if (!live) return;
        var list = (scope || document).querySelectorAll('[data-ticket-link]');
        for (var i = 0; i < list.length; i++) rewrite(list[i]);
    }

    /* ---------- P2-14: Mess-Hook (cookielos, optional) ----------
       window.fsbfTrack(name, props)
       - ruft Plausible bzw. Matomo nur auf, wenn eingebunden (sonst no-op)
       - dispatcht immer CustomEvent('fsbf:cta', {detail:{name, props}}) auf document */
    function dispatch(name, props) {
        var detail = { name: name, props: props || {} };
        var ev;
        try {
            ev = new window.CustomEvent('fsbf:cta', { detail: detail });
        } catch (e) {
            if (!document.createEvent) return;
            ev = document.createEvent('CustomEvent');
            ev.initCustomEvent('fsbf:cta', false, false, detail);
        }
        document.dispatchEvent(ev);
    }

    function track(name, props) {
        props = props || {};
        try {
            if (typeof window.plausible === 'function') {
                window.plausible(name, { props: props });
            }
            if (window._paq && typeof window._paq.push === 'function') {
                window._paq.push(['trackEvent', 'CTA', name, props.cta || '']);
            }
        } catch (e) { /* Analytics darf nie den Klick blockieren */ }
        try { dispatch(name, props); } catch (e2) { /* no-op */ }
    }

    window.fsbfTrack = window.fsbfTrack || track;
    window.fsbfTickets = {
        url: TICKET_URL,
        live: live,
        href: ticketHref,
        refresh: rewriteAll
    };
    window.fsbfWorkshops = { url: WORKSHOP_URL, live: workshopsLive };

    /* Delegierter Listener: zaehlt jeden [data-cta]-Klick und stellt sicher,
       dass auch nachtraeglich eingefuegte Ticket-Links korrekt zeigen. */
    function closestCta(node) {
        while (node && node !== document) {
            if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-cta')) return node;
            node = node.parentNode;
        }
        return null;
    }

    document.addEventListener('click', function (e) {
        var el = closestCta(e.target);
        if (!el) return;
        var isTicket = el.hasAttribute('data-ticket-link');
        if (isTicket) rewrite(el);
        window.fsbfTrack(isTicket ? 'Ticket CTA' : 'CTA', {
            cta: getCta(el),
            href: el.getAttribute('href') || '',
            live: live ? 'yes' : 'no'
        });
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { rewriteAll(); activateWorkshopLinks(); });
    } else {
        rewriteAll();
        activateWorkshopLinks();
    }
})(window, document);
