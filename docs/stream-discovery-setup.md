# Automatische Demo-Streamer-Suche – Status und Einrichtung

Stand: 19. November 2026. **YouTube-API ist aktiv und im GitHub-Workflow erfolgreich getestet. Twitch benötigt noch eigene Zugangsdaten.**

## Ergebnis auf der DemoRadar-Website
- Unter den Veranstaltungskarten und im Eventdetail erscheinen von Menschen geprüfte Streams/Aufzeichnungen aus `data/live-streams.json`.
- Automatisch entdeckte Treffer aus `data/stream-discoveries.json` werden **nur als mögliche, unbestätigte Zuordnung** dargestellt (farblich abgesetzt).
- Ein vorläufiger Live-Hinweis wird nur angezeigt, wenn die offizielle Plattformabfrage jünger als 15 Minuten ist. Beim Offenlassen der Seite wird er minütlich neu bewertet; das ersetzt keine neue Plattformabfrage.
- Ohne Treffer gibt es weiterhin Suchlinks zu YouTube und Twitch.
- Die sechs ursprünglich genannten Streamer sowie weitere öffentlich belegte YouTube-Kanäle liegen als Kandidaten in `data/streamer-candidates.json`. Einige YouTube-Kanäle sind noch nicht eindeutig bestätigt.

## Technischer Aufbau
- `scripts/update-streams.mjs` liest die letzten 50 Kanal-Uploads über `channels.list`, `playlistItems.list` und `videos.list`. Es nutzt keine kostspieligen `search.list`-Anfragen; drei API-Abfragen je YouTube-Kanal und Lauf.
- Der GitHub-Workflow `.github/workflows/stream-discovery.yml` ist auf 15-Minuten-Takt eingerichtet. Die zehn erfolgreich geprüften YouTube-Kanäle verbrauchen überschlägig 30 API-Einheiten pro Lauf (etwa 2.880 pro Tag bei pünktlicher Ausführung); API-Quoten können sich ändern.
- `scripts/stream-matcher.mjs` prüft Wortgrenzen beim Ortsnamen, Berliner Kalenderdatum statt ungeprüfter UTC-Tagesangabe, konkreten Demonstrationsbezug und mindestens zwei spezifische Themenbegriffe. Für kurze Titel sind ein Themenbegriff und ein namentlich genannter markanter Veranstaltungsort erforderlich.
- Bei gleich guten Zuordnungen zu mehreren Demos wird **kein** automatischer Treffer angezeigt.
- Livestreams müssen am Veranstaltungstag stattfinden. Aufzeichnungen können im engen Datumsfenster nachträglich veröffentlicht worden sein. Zusätzlich wird ein explizit im Videotitel genanntes Datum gegen das Veranstaltungsdatum geprüft. Die Veranstaltungsrecherche reicht bis zu 30 Tage zurück. Videotitel wie `Köln14.11.26` werden erkannt; ein tatsächlich später veröffentlichter Archiv-Ausschnitt bleibt als ungeprüfter Vorschlag markiert.
- `scripts/test-stream-matcher.mjs` enthält 33 sicherheitsorientierte Fälle, etwa falscher Ort, falsches Datum, Gaming-Streams, Kurzthemen und mehrdeutige Doppelveranstaltungen. Die Tests laufen vor jeder API-Abfrage.
- `data/stream-discoveries.json` enthält Kandidaten als `reviewed: false`, keine bestätigten Veranstaltungsstreams. Es bleibt strikt getrennt von `data/live-streams.json`.
- Es werden maximal 20 YouTube-Kanäle und höchstens 100 mögliche Treffer verwaltet. Ein LIVE-Hinweis verfällt nach 15 Minuten.
- Die Zahl geprüfter Kanäle, Videos, Streams und API-Fehler steht in der Ergebnisdatei. Drei echte Videotitel pro Kanal werden als öffentliche, begrenzte Diagnose-Stichprobe gespeichert; diese Titel sind **keine** Demo-Zuordnungen. `scripts/stream-coverage-audit.mjs` protokolliert zusätzlich, ob Stadt, Datum und Thema überhaupt in den importierten Demonstrationsmeldungen auftauchen.

## Einmalige kostenfreie Inbetriebnahme (ohne Schlüssel im Chat zu teilen)
1. Google Cloud Console: YouTube Data API v3 in eigenem Projekt aktivieren, eingeschränkten API-Key für YouTube Data API erstellen und kostenlose Nutzungsquoten prüfen.
2. GitHub Repository `PuntaCanada/demoradar` → Settings → Secrets and variables → Actions → New repository secret: `YOUTUBE_API_KEY`. API-Key **nicht** in den Code committen.
3. Twitch Developer Console: App registrieren und Client-ID/Client-Secret unter GitHub Actions Secrets `TWITCH_CLIENT_ID` und `TWITCH_CLIENT_SECRET` hinterlegen.
4. In GitHub Actions den Workflow `DemoRadar Stream-Suche (optional)` manuell starten. Prüfen, ob `data/stream-discoveries.json` erscheint, und Fehler im Job-Log kontrollieren.
5. Testen: Bekannter Stream über einen konkreten Veranstaltungstitel/Ort; allgemeiner politischer Livestream darf nicht einer beliebigen Demo zugeordnet werden.

## Einschränkungen
- Die 15-Minuten-Grenze ist keine Garantie für Live-Erkennung; GitHub Actions können verzögert starten und Plattformen liefern nicht alle Streams zuverlässig.
- Eine Kanal-Live-Anzeige beweist keine konkrete Veranstaltung. Auch besonders streng gefilterte Vorschläge können falsche Treffer sein.
- YouTube ist als Kanalabfrage aktiv, aber **ein geprüfter Event-Match ist nicht garantiert**. Twitch ist mangels Secrets noch nicht aktiviert. Beide APIs unterliegen Kontingenten und Verfügbarkeitsgrenzen.
- Eigene Datenschutz- und Nutzungsrechtshinweise für veröffentlichte Metadaten und Links prüfen.
- Keine automatischen Kontosperren, keine politischen Favorisierungen, keine automatischen Video-Reuploads.

## Geprüfte Erkenntnisse aus dem echten Workflow am 19.11.2026
- **10 YouTube-Kanäle**, **500 Video-Metadatensätze**, **228 beendete oder laufende Streams**; keine gemeldeten API-Fehler.
- Eine nach Kanälen ausgeglichene Stichprobe von **23 öffentlich verfügbaren Videotiteln** traf auf **2.148** eingelesene DemoRadar-Veranstaltungsdatensätze.
- Nur **5** Titel hatten einen Ortsbezug zu importierten Veranstaltungsdaten, **0** erfüllten zusätzlich die Datumsprüfung. Es wurden **keine** ungeprüften Streams als bestätigte LIVE-Berichte ausgegeben.
- Reale Videotitel zeigen u.a. Kurzdatumsformen `14.11.26`, an Ortsnamen angeklebte Daten, nachträgliche Videoausschnitte und die Worte `Gegendemo` oder `Naziaufmarsch`. Diese Schreibweisen sind nun in den konservativen Prüfkriterien berücksichtigt.
- **Die Hauptgrenze ist die Abdeckung der Demo-Termine**, nicht die Video-API. Nicht vorhandene Termine werden weder erfunden noch aus einem Videotitel als amtliche Versammlung importiert.
