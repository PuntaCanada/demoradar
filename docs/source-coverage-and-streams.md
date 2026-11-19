# DemoRadar: Abdeckung amtlicher Demonstrationsdaten und Video-Aufzeichnungen

Stand: 19. November 2026.

## Verfahren

- Aktuell importierte Veranstaltungen stammen ausschließlich aus nachvollziehbaren Quellen in `data/events.json` bzw. separat gekennzeichneten Gemeindedaten in `data/demos-events.json`.
- `scripts/source-coverage.mjs` zählt lediglich bereits belegte Ereignisse im Zeitfenster: vergangene 30 Tage, kommende sieben Tage. Ergebnisse stehen unter `data/source-coverage.json`.
- Die Quelle eines Videotitels ist **kein** Beleg für eine amtliche Versammlungsanmeldung und wird niemals als neues amtliches Ereignis importiert.
- `data/stream-discoveries.json` speichert API-abgefragte Videos und ungeprüfte Zuordnungsvorschläge. Nur passend belegte Einträge können später als bestätigte Verknüpfung in `data/live-streams.json` aufgenommen werden.
- Erreichbarkeit einer Behördenseite ist weder eine Live-Datenquelle noch eine Lizenz zur Übernahme ihrer Inhalte.

## Reales Ergebnis des Abgleichs

Ein automatisierter GitHub-Lauf hat am 19. November 2026 im Zeitfenster 20. Oktober bis 26. November insgesamt **430** eindeutige Veranstaltungsdatensätze gezählt. Darunter **368 Berlin**, **0 Köln**, **0 Hamburg**, **0 Düsseldorf**, **0 Frankfurt am Main** und **0 Leipzig** im untersuchten Importbestand. Diese Nullwerte bezeichnen ausschließlich Datenlücken; sie sagen nichts darüber aus, ob Demonstrationen stattgefunden haben.

Die ausgewertete Video-Stichprobe umfasst **23** Titel. Die Quellenanalyse zeigte echte Ortsnennungen für unterversorgte Städte. Es gab keine belastbare Verbindung von Stadt, Datum und thematischem Bezug, die ein Video automatisch einer bereits importierten Demo zuordnet. **Keine erfundenen LIVE- oder Veranstaltungsdaten.**

## Quellenrecherche

- [Leipziger Open-Data-Portal, Rallymap](https://opendata.leipzig.de/showcase/rallymap): historische Hackathon-Anwendung aus 2023 mit Ziel einer späteren Open-Data-Bereitstellung. **Nicht** als aktuell nutzbare 2026-Datenquelle nachgewiesen.
- [Stadt Dortmund – Publikationen](https://www.dortmund.de/rathaus/publikationen/): amtliche Veröffentlichungen; **kein** nachgewiesener, maschinenlesbarer Terminkalender für Demonstrationen.
- [Stadt Köln – Verkehrskalender](https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/): importer vorhanden, aber ausschließlich explizite, vollständig datierte Demo-Meldungen werden übernommen; keine allgemeine Versammlungsliste.
- [Stadt Braunschweig – öffentliche Versammlungsliste](https://www.braunschweig.de/politik_verwaltung/bekanntmachungen/versammlungen/index.php): eingeschränkt auf Bekanntmachungen mit Einwilligung, bisher keine umfassende maschinenlesbare Quelle.
- [Historischer Forschungsdatensatz zu amtlichen Protestanmeldungen](https://github.com/davidpomerenke/german-protest-registrations): endet spätestens 2022 und ist **nicht** für aktuelle DemoRadar-Ankündigungen geeignet.

Die Quellen werden unter `data/expansion-sources.json` ausschließlich zum Monitoring geführt, wenn keine zulässige aktuelle Datenübernahme möglich ist. Quellenkontakte und Nutzungsrechte bleiben Voraussetzungen für weitere Imports.

## Qualitätssicherung

- `scripts/test-source-monitor.py`: offizielles Quellenmonitoring erzeugt keine Demonstrationstermine und unterscheidet Seitenreichweite von tatsächlicher Datenverfügbarkeit.
- `scripts/test-source-coverage.mjs`: doppelte IDs, ungültige Daten, fehlende Stadt, irreführende Titel und Rechtefelder.
- `scripts/test-stream-matcher.mjs`: konservative Stream-Zuordnung, Mehrdeutigkeits- und Datumsregeln.
- GitHub Actions aktualisiert das Abdeckungsprotokoll über den bestehenden kostenlosen 15-Minuten-Workflow; keine zusätzliche Infrastruktur.
- Auf der Website erscheinen nur ausdrücklich als vorläufig bezeichnete automatische Treffer oder manuell geprüfte Links. Eine Nullzählung wird nicht als `keine Demos` ausgelegt.

## Nächste seriöse Erweiterungen

Eine nachweislich aktuelle und freigegebene Datei/API der zuständigen Versammlungsbehörden aus Köln, Hamburg, Düsseldorf, Leipzig und weiteren Städten wäre der entscheidende Fortschritt. Neue Quellen werden erst nach Format-, Aktualitäts-, Verfügbarkeits- und Rechteprüfung angeschlossen. Ein Aufzeichnungsvideo allein erzeugt niemals eine amtliche Versammlung.
