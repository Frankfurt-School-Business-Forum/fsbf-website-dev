# FSBF App 2026: Prototyp und Backlog fürs Team

Stand: 22.10.2026. Vorschau: https://dev.fs-businessforum.com/app-2026/

Das hier ist ein klickbarer **HTML-Prototyp** der Teilnehmer-App für das FS Business Forum 2026
(Fri 13 / Sat 14 Nov). Er hat kein Backend: Alles läuft in einer Datei, der Zustand bleibt im Browser.
Über **Controls** (oben in der Prototyp-Leiste) lassen sich alle Zustände durchklicken: vor dem Event,
Event-Tag, danach, angemeldet oder nicht, Käufer mit mehreren Tickets, einzelnes Ticket, Freundes-Ticket.
**Notes** erklärt pro Ansicht, was dahinter steckt und welche Entscheidung dazu gehört.

Cedrik baut bis Mo 26.10. nur die **Workshop-Bewerbung** (in FSBF Connect). Die App übernimmt das Team.
Alles unten ist Backlog für die App.

## Was im Prototyp steht

- **Home:** Video-Hero, nächste Programmpunkte, Workshops, Partner und Booths.
- **Program:** Fri und Sat, Filter, Herz zum Merken, Programmpunkt-Sheet mit Speakern und Partner.
- **Speakers:** Liste untereinander (Foto, Name, Titel, Firma, Herz) wie im alten Mockup unter `/event/`.
  Sheet mit Bio, Sessions, LinkedIn, „Save to My Forum“.
- **Partners:** nach Stufe, Sheet mit dem **wörtlichen** Partnertext in Originalsprache (DE gekennzeichnet),
  Website, Workshop, Booth.
- **My Forum:** Konto, Saved sessions, My workshops (Status der Bewerbungen), My ticket, Profile.
- **Good to know:** vier Zeilen, Rest hinter „More info“.

## Regeln, die Cedrik festgelegt hat

- Texte von Partnern und Speakern **wörtlich** wie geliefert, in der Originalsprache. Keine eigenen
  Übersetzungen oder Kurzfassungen. Deutsche Texte bekommen die Kennzeichnung „DE“.
- Offizielle Logos nie beschneiden (Schwarz: Gruppenlogo, DVAG: volles Logo).
- Workshop-Details von Unternehmen der Schwarz Gruppe sind **nicht freigegeben**. Bis zur Freigabe nur
  „Workshop with Unternehmen der Schwarz Gruppe“ und der Teaser.
- Keine Kategorie-Tags im Programm, kein Hinweis auf parallele Programmpunkte.
- UI englisch, keine Gedankenstriche in UI-Texten.
- Nur eigene Assets (Aftermovie, Fotos, Logos), nichts aus dem Internet.
- Freundes-Tickets: Wer ein Ticket von jemand anderem hat, fragt beim Käufer an. Der Käufer stimmt zu
  oder lehnt ab. Wortwahl immer „add your name“, nie „transfer“.

## Backlog

### Daten und Anbindung
- [ ] Inhalte aus FSBF Connect laden statt hart im HTML (Speaker, Partner, Programm, Booths).
      Datenmodell steht in Connect: `docs/workshops-content-model.md` im Connect-Repo.
- [ ] Anmeldung mit derselben Gast-Session wie die Workshop-Bewerbung (Ticketnummer plus Vorname,
      Magic Link). Die Schnittstellen `/api/t/*` gibt es in Connect schon.
- [ ] My Forum an echte Daten: Bewerbungen, Ticket, Profil, gemerkte Sessions.
- [ ] Käufer trägt Namen für seine weiteren Tickets ein („Add a name“). Ist für den Bewerbungsstart
      bewusst weggelassen, die API dazu existiert.
- [ ] Hosting und Domain der App festlegen. `app.fs-businessforum.com` zeigt heute auf die alte App bei
      einem fremden Netlify-Konto.

### Inhalte, die noch fehlen oder bestätigt werden müssen
- [ ] LinkedIn-URLs pro Speaker in Connect pflegen. Bis dahin öffnet der Knopf eine LinkedIn-Suche.
- [ ] Talk-Titel von Wintels, Neske, Rühl und Brzeski stehen nur auf Deutsch: bestätigen oder englische
      Fassung bei den Speakern holen.
- [ ] Bios von Dr. Kai-Uwe Steck und Valde Dinges gibt es nur auf Deutsch. Englische Fassung bei den
      Speakern anfragen, falls gewünscht.
- [ ] Privatize: Partnertext, Website und der Link auf deren Bewerbungsformular fehlen.
- [ ] Schwarz: Freigabe der Workshop-Details einholen.
- [ ] Career Speed Dating am Sat beginnt 10:30, Einlass am Sat ist 11:00. Zeiten prüfen.
- [ ] Ablauf von Wine Tasting und Alumni Roundtable (wer darf hin, Anmeldung ja oder nein) klären.
- [ ] Bildrechte für Aftermovie-Ausschnitte und Fotos bestätigen.
- [ ] Räume pro Programmpunkt eintragen.

### Später
- [ ] Event-Tag: Live-Uhr und „Now“ im Programm mit echter Zeit statt Demo-Uhr.
- [ ] Schrift für Namen: Der Prototyp nutzt Systemschriften (Iowan, Palatino, Georgia), keine eigene
      Serifenschrift eingebunden.
- [ ] Einlass über Connect: zwei Accounts für die Event-Computer mit nur lesendem Zugriff auf die Tickets.

## Technisches

- Eine Datei (`index.html`), kein Build, keine externen Skripte oder CDNs. Assets liegen in `assets/`.
- Zustand im `localStorage` des Browsers. „Reset demo“ in Controls setzt ihn zurück.
- Personen im Prototyp sind ausgedacht (Max Sommer, Clara Ehrlich, Lena Schmidt, Lea Wagner).
- Die Quelle liegt in Cedriks Prototyp-Ordner (`fsbf-event/prototyp/app.html`). Diese Kopie entsteht mit
  `publish_dev.py`, das die Workshop-, Connect- und Mail-Seiten weglässt.
