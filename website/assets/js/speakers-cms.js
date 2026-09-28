// Homepage only: fetch speakers independently of shared page initialization.
(function () {
    'use strict';
    var controller = new AbortController();
    var query = '*[_type == "speaker" && visible == true] | order(sortOrder asc, name asc, _id asc){name,role,companyName,portraitAlt,linkedinUrl,badgeText,"portraitUrl":portrait.asset->url,"logoUrl":companyLogo.asset->url}';
    var url = 'https://m3oobx03.apicdn.sanity.io/v2025-02-19/data/query/production?perspective=published&query=' + encodeURIComponent(query);
    function text(value) { return typeof value === 'string' && value.trim().length > 0; }
    function asset(value) {
        try { var u = new URL(value); return u.protocol === 'https:' && u.hostname === 'cdn.sanity.io' && u.pathname.startsWith('/images/m3oobx03/production/'); }
        catch (_) { return false; }
    }
    function linkedin(value) {
        try { var u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (u.hostname === 'linkedin.com' || u.hostname.endsWith('.linkedin.com')); }
        catch (_) { return false; }
    }
    function node(tag, className, value) {
        var el = document.createElement(tag);
        el.className = className;
        if (value !== undefined) el.textContent = value;
        return el;
    }
    function image(src, alt) {
        var el = document.createElement('img');
        el.src = src; el.alt = alt; el.loading = 'lazy'; el.decoding = 'async';
        return el;
    }
    function render(records) {
        var grid = document.querySelector('.speakers-grid');
        if (!grid || grid.dataset.cmsSpeakersRendered === 'true' || !Array.isArray(records)) return;
        var fragment = document.createDocumentFragment();
        records.forEach(function (speaker) {
            if (!speaker || !text(speaker.name) || !text(speaker.role) || !text(speaker.companyName) || !text(speaker.portraitAlt) || !asset(speaker.portraitUrl)) return;
            var card = node('div', 'speaker-card');
            // The linked portrait itself retains the image wrapper's sizing/hover classes.
            var portrait = node(linkedin(speaker.linkedinUrl) ? 'a' : 'div', 'speaker-image');
            if (portrait.tagName === 'A') {
                portrait.href = speaker.linkedinUrl;
                portrait.target = '_blank'; portrait.rel = 'noopener noreferrer';
                portrait.style.display = 'block';
                portrait.setAttribute('aria-label', speaker.name + ' on LinkedIn (opens in a new tab)');
            }
            portrait.appendChild(image(speaker.portraitUrl, speaker.portraitAlt));
            if (asset(speaker.logoUrl)) {
                var badge = node('div', 'speaker-logo-badge');
                badge.appendChild(image(speaker.logoUrl, speaker.companyName));
                portrait.appendChild(badge);
            } else if (text(speaker.badgeText)) {
                portrait.appendChild(node('div', 'speaker-logo-badge speaker-logo-badge--text', speaker.badgeText));
            }
            var info = node('div', 'speaker-info');
            info.appendChild(node('h3', 'speaker-name', speaker.name));
            info.appendChild(node('p', 'speaker-role', speaker.role));
            info.appendChild(node('p', 'speaker-company', speaker.companyName));
            card.appendChild(portrait); card.appendChild(info); fragment.appendChild(card);
        });
        grid.insertBefore(fragment, grid.querySelector('.speaker-card--placeholder'));
        grid.dataset.cmsSpeakersRendered = 'true';
        if (typeof window.initSpeakerCards === 'function') window.initSpeakerCards(grid);
        if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
            window.ScrollTrigger.refresh();
        }
    }
    var timeout;
    var deadline = new Promise(function (resolve) {
        timeout = setTimeout(function () { controller.abort(); resolve(null); }, 5000);
    });
    var request = fetch(url, {credentials: 'omit', signal: controller.signal})
        .then(function (response) { if (!response.ok) throw new Error('Speaker request failed'); return response.json(); })
        .then(function (payload) { return payload && payload.result; })
        .catch(function () { return null; });
    Promise.race([request, deadline])
        .then(render)
        .finally(function () { clearTimeout(timeout); });
})();
