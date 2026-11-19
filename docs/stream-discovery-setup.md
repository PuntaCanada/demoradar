# Automatische Demo-Streamer-Suche – Status und Einrichtung

Stand: 19. November 2026. **Implementiert, aber mangels API-Credentials noch nicht aktiv.**

## Ergebnis auf der DemoRadar-Website
- Unter den Veranstaltungskarten und im Eventdetail erscheinen von Menschen geprüfte Streams/Aufzeichnungen aus `data/live-streams.json`.
- Automatisch entdeckte Treffer aus `data/stream-discoveries.json` werden **nur als mögliche, unbestätigte Zuordnung** dargestellt (farblich abgesetzt).
- Ein vorläufiger Live-Hinweis wird nur angezeigt, wenn die offizielle Plattformabfrage jünger als 15 Minuten ist. Beim Offenlassen der Seite wird er minütlich neu bewertet.
- Ohne Treffer gibt es weiterhin Suchlinks zu YouTube und Twitch.
- Die sechs vom Nutzer genannten Streamer liegen als Kandidaten in `data/streamer-candidates.json`. Einige YouTube-Kanäle sind noch nicht eindeutig bestätigt.

## Technischer Aufbau
- `scripts/update-streams.mjs` liest die letzten 50 Kanal-Uploads über `channels.list`, `playlistItems.list` und `videos.list`. Es nutzt keine kostspieligen `search.list`-Anfragen; drei API-Abfragen je YouTube-Kanal und Lauf.
- Der GitHub-Workflow `.github/workflows/stream-discovery.yml` ist auf 15-Minuten-Takt eingerichtet. Die vorhandenen drei YouTube-Kanäle verbrauchen überschlägig 9 API-Einheiten pro Lauf; API-Quoten können sich ändern.
- `scripts/stream-matcher.mjs` prüft Wortgrenzen beim Ortsnamen, Berliner Kalenderdatum statt ungeprüfter UTC-Tagesangabe, konkreten Demonstrationsbezug und mindestens zwei spezifische Themenbegriffe. Für kurze Titel sind ein Themenbegriff und ein namentlich genannter markanter Veranstaltungsort erforderlich.
- Bei gleich guten Zuordnungen zu mehreren Demos wird **kein** automatischer Treffer angezeigt.
- Livestreams müssen am Veranstaltungstag stattfinden. Aufzeichnungen können mit engem Zeitfenster später publiziert worden sein.
- `scripts/test-stream-matcher.mjs` enthält 20 sicherheitsorientierte Fälle, etwa falscher Ort, falsches Datum, Gaming-Streams, Kurzthemen und mehrdeutige Doppelveranstaltungen. Die Tests laufen vor jeder API-Abfrage.
- `data/stream-discoveries.json` enthält Kandidaten als `reviewed: false`, keine bestätigten Veranstaltungsstreams. Es bleibt strikt getrennt von `data/live-streams.json`.
- Es werden maximal 20 YouTube-Kanäle und höchstens 100 mögliche Treffer verwaltet. Ein LIVE-Hinweis verfällt nach 15 Minuten.
- Die Zahl geprüfter Kanäle, Videos, Streams und API-Fehler steht in der Ergebnisdatei.

## Einmalige kostenfreie Inbetriebnahme (ohne Schlüssel im Chat zu teilen)
1. Google Cloud Console: YouTube Data API v3 in eigenem Projekt aktivieren, eingeschränkten API-Key für YouTube Data API erstellen und kostenlose Nutzungsquoten prüfen.
2. GitHub Repository `PuntaCanada/demoradar` → Settings → Secrets and variables → Actions → New repository secret: `YOUTUBE_API_KEY`. API-Key **nicht** in den Code committen.
3. Twitch Developer Console: App registrieren und Client-ID/Client-Secret unter GitHub Actions Secrets `TWITCH_CLIENT_ID` und `TWITCH_CLIENT_SECRET` hinterlegen.
4. In GitHub Actions den Workflow `DemoRadar Stream-Suche (optional)` manuell starten. Prüfen, ob `data/stream-discoveries.json` erscheint, und Fehler im Job-Log kontrollieren.
5. Testen: Bekannter Stream über einen konkreten Veranstaltungstitel/Ort; allgemeiner politischer Livestream darf nicht einer beliebigen Demo zugeordnet werden.

## Einschränkungen
- Die 15-Minuten-Grenze ist keine Garantie für Live-Erkennung; GitHub Actions können verzögert starten und Plattformen liefern nicht alle Streams zuverlässig.
- Eine Kanal-Live-Anzeige beweist keine konkrete Veranstaltung. Auch besonders streng gefilterte Vorschläge können falsche Treffer sein.
- YouTube API und Twitch API haben Limits und benötigen Schlüssel; **nicht** behaupten, dass Streaming bereits überwacht wird.
- Eigene Datenschutz- und Nutzungsrechtshinweise für veröffentlichte Metadaten und Links prüfen.
- Keine automatischen Kontosperren, keine politischen Favorisierungen, keine automatischen Video-Reuploads.
