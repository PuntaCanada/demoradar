# Automatische Demo-Streamer-Suche – Status und Einrichtung

Stand: 19. November 2026. **Implementiert, aber mangels API-Credentials noch nicht aktiv.**

## Ergebnis auf der DemoRadar-Website
- Unter den Veranstaltungskarten und im Eventdetail erscheinen von Menschen geprüfte Streams/Aufzeichnungen aus `data/live-streams.json`.
- Automatisch entdeckte Treffer aus `data/stream-discoveries.json` werden **nur als mögliche, unbestätigte Zuordnung** dargestellt (farblich abgesetzt).
- Ein vorläufiger Live-Hinweis wird nur angezeigt, wenn die offizielle Plattformabfrage jünger als 15 Minuten ist. Beim Offenlassen der Seite wird er minütlich neu bewertet.
- Ohne Treffer gibt es weiterhin Suchlinks zu YouTube und Twitch.
- Die sechs vom Nutzer genannten Streamer liegen als Kandidaten in `data/streamer-candidates.json`. Einige YouTube-Kanäle sind noch nicht eindeutig bestätigt.

## Technischer Aufbau
- `scripts/update-streams.mjs` nutzt offiziell dokumentierte YouTube Data API und Twitch Helix API, ohne Fremdseiten zu scrapen.
- GitHub Action `.github/workflows/stream-discovery.yml` prüft bei gesetzten Schlüsseln alle 15 Minuten. Ohne Schlüssel beendet sie sich ohne Datenänderung.
- Matching: Stadt im Videotitel, mindestens zwei nichttriviale Themenwörter aus dem Veranstaltungstitel, Demo-Begriff im Videotitel, Datumsnähe maximal drei Tage. Es sind nur Vorschläge, keine bestätigten Event-Streams.
- Letzte 7 und nächste 7 Tage aus `data/events.json` und `data/demos-events.json` bilden den Suchraum.
- Geprüfte Streams in `data/live-streams.json` bleiben strikt getrennt; Vorschläge werden nicht automatisch als `reviewed=true` markiert.
- Begrenzung der Ausgabe auf 100 Vorschläge, Verfallsdatum 14 Tage. Es werden nur geänderte Ergebnisse committet.

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
