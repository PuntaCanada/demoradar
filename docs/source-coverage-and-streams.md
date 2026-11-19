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

## Neue amtlich belegte Kölner Termine (19. November 2026)

Die [Originalmeldung der Polizei Köln](https://www.presseportal.de/blaulicht/pm/12415/6393559) nennt für Freitag, 20. November 2026, zwei eigenständige Versammlungen:
- **Unsere Zukunft liegt in unseren Händen (Gen Z regelt Köln)**, 13:00–19:00 Uhr. Der ursprünglich vorgeschlagene Aufzug wurde von der Polizei abgelehnt; als Alternative wurde die Deutzer Werft angeboten. Deshalb werden **kein fester Veranstaltungsort und keine verbindliche Route** in DemoRadar behauptet.
- **Schulstreik gegen die Wehrpflicht**, 11:00–16:00 Uhr. Laut Polizei war diese Versammlung bereits Ende Oktober bestätigt worden. Die in der Meldung erwähnte Route wird nicht als endgültig feststehend ausgegeben.

Der neue Importer `scripts/update-police-notices.py` prüft ausschließlich die bekannte Originalmeldung und überträgt höchstens diese zwei eindeutig belegten Kerndaten als eigene Datensätze. Er funktioniert nicht als allgemeiner, umfassender Kölner Demo-Kalender. In `data/police-notices-source.json` wird der Importstatus dokumentiert. Der Import nutzt faktische Angaben und verlinkt die Quelle, ohne geschützte Pressetexte zu kopieren.

**Wichtig:** Der bisherige Abdeckungsbericht mit null Kölner Datensätzen stammt aus einem *früheren* Lauf. Eine erfolgreiche Prüfung des Importers bedeutet erst dann eine veröffentlichte Datenaktualisierung, wenn der anschließende GitHub-Commit auch wirklich auf `main` angekommen ist.

## Zuständige Stellen in anderen Zielstädten

- **Düsseldorf:** Die [Stadtverwaltung verweist für Versammlungen ausdrücklich auf die Polizei](https://www.duesseldorf.de/veranstaltungsmanagement); der gewöhnliche Veranstaltungskalender ist deshalb keine geeignete verifizierte Demoquelle. Keine freigegebene vollständige Live-Terminliste belegt.
- **Hamburg:** Die [Versammlungsbehörde der Polizei](https://www.polizei.hamburg/versammlungsbehoerde-kontakt-791244) bietet Anmeldung und Information, aber keine allgemein nutzbare aktuelle Kalender-API. Eine [amtliche Polizeimeldung](https://www.polizei.hamburg/polizeilicher-einsatzraum-hamburg-mit-drohnenflugbeschraenkung-1239648) bestätigt mehrere Versammlungen für den 20. November, nennt jedoch nicht ausreichend präzise eigenständige Termine zur automatischen Einzelübernahme.
- **Leipzig:** Das historische [Rallymap-Projekt](https://opendata.leipzig.de/showcase/rallymap) beschreibt das Ziel offener Versammlungsdaten; kein nutzbares, aktuelles Feedformat mit geklärten Rechten belegt.

## Quellenrecherche

- [Leipziger Open-Data-Portal, Rallymap](https://opendata.leipzig.de/showcase/rallymap): historische Hackathon-Anwendung aus 2023 mit Ziel einer späteren Open-Data-Bereitstellung. **Nicht** als aktuell nutzbare 2026-Datenquelle nachgewiesen.
- [Stadt Dortmund – Publikationen](https://www.dortmund.de/rathaus/publikationen/): amtliche Veröffentlichungen; **kein** nachgewiesener, maschinenlesbarer Terminkalender für Demonstrationen.
- [Stadt Köln – Verkehrskalender](https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/): importer vorhanden, aber ausschließlich explizite, vollständig datierte Demo-Meldungen werden übernommen; keine allgemeine Versammlungsliste.
- [Stadt Braunschweig – öffentliche Versammlungsliste](https://www.braunschweig.de/politik_verwaltung/bekanntmachungen/versammlungen/index.php): eingeschränkt auf Bekanntmachungen mit Einwilligung, bisher keine umfassende maschinenlesbare Quelle.
- [Historischer Forschungsdatensatz zu amtlichen Protestanmeldungen](https://github.com/davidpomerenke/german-protest-registrations): endet spätestens 2022 und ist **nicht** für aktuelle DemoRadar-Ankündigungen geeignet.

Die Quellen werden unter `data/expansion-sources.json` ausschließlich zum Monitoring geführt, wenn keine zulässige aktuelle Datenübernahme möglich ist. Quellenkontakte und Nutzungsrechte bleiben Voraussetzungen für weitere Imports.

## Neue amtliche Leipziger Quelle (19. November 2026)

Die [Originalankündigung der Polizeidirektion Leipzig](https://www.polizei.sachsen.de/de/einsatz-anlaesslich-des-schuelerstreiks-und-des-protestes-der-generation-z-am-20-november-2026-44497.html) vom 17. November 2026 enthält ausdrücklich zwei am 20. November angezeigte Versammlungen:
- **Internationaler Schulstreik gegen die Wehrpflicht**, 10:00–16:45 Uhr, Kundgebung auf dem kleinen Wilhelm-Leuschner-Platz; geplanter Aufzug im Anschluss.
- **Gen Z regelt**, 17:00–21:00 Uhr, geplanter Start auf dem kleinen Wilhelm-Leuschner-Platz.

`scripts/update-leipzig-police.py` akzeptiert nur diese ausdrücklich erlaubte Einzelquelle, prüft Datum, Polizeiautorenschaft, zwei voneinander getrennte Zeitfenster und bekannten Platz und speichert nur knappe Tatsachen mit Originalquellenverweis. Eine konkrete endgültige Route wird nicht übernommen. Es handelt sich nicht um eine vollständige Leipziger Versammlungsliste. Die Ergebnisse von `scripts/test-leipzig-police.py` werden vor jeder Übernahme geprüft.

## Automatische Quellengüte und Datenlücken

`scripts/audit-source-quality.mjs` erzeugt `data/source-quality.json` aus den **tatsächlichen Ergebnissen** der Importer – nicht durch Spekulation oder Auswertung der Medienlage. Die fünf Zustände sind:

- `observed_data`: Ein geprüfter Import hat Quelldatensätze geliefert; dies besagt nichts über landesweite Vollständigkeit.
- `verified_one_off`: Eine konkrete amtliche Einzelmeldung ist aktuell belegt, kein regelmäßiger Event-Feed.
- `no_matching_items`: Eine Quelle ist erreichbar, aber der konservative Importer hat keine passenden Einträge übernommen.
- `unavailable`: Die Quelle war nicht erreichbar; frühere Einträge werden nicht als abgesagt bezeichnet.
- `unknown`: Keine ausreichende Statusbeobachtung.

Die Heatmap kombiniert weiterhin die bewusst zurückhaltende Länderabdeckung aus `data/state-source-coverage.json` mit dieser beobachteten Quellengüte. **Fehlende Einträge oder Quellen sind kein Nachweis dafür, dass keine Demonstrationen stattfinden.** Auch eine offizielle Stadtquelle ist keine komplette Bundeslandabdeckung.

Die YouTube-Zuordnung hat neue Tests für Videos mit widersprüchlichen Datumsangaben oder unmöglichen Kalendertagen. Solche Videos werden nicht automatisch einer bestimmten Veranstaltung zugeordnet; selbst erfolgreiche Vorschläge bleiben `reviewed:false`.

## Qualitätssicherung

- `scripts/test-police-notices.py`: offizielle Fakten und Datum werden mit Offline-Prüfungen validiert; fehlende Quellen und unbestätigte Orte erzeugen keine erfundenen Termine.
- `scripts/test-source-monitor.py`: offizielles Quellenmonitoring erzeugt keine Demonstrationstermine und unterscheidet Seitenreichweite von tatsächlicher Datenverfügbarkeit.
- `scripts/test-source-coverage.mjs`: doppelte IDs, ungültige Daten, fehlende Stadt, irreführende Titel und Rechtefelder.
- `scripts/test-stream-matcher.mjs`: konservative Stream-Zuordnung, Mehrdeutigkeits- und Datumsregeln.
- GitHub Actions aktualisiert das Abdeckungsprotokoll über den bestehenden kostenlosen 15-Minuten-Workflow; keine zusätzliche Infrastruktur.
- Auf der Website erscheinen nur ausdrücklich als vorläufig bezeichnete automatische Treffer oder manuell geprüfte Links. Eine Nullzählung wird nicht als `keine Demos` ausgelegt.

## Nächste seriöse Erweiterungen

Eine nachweislich aktuelle und freigegebene Datei/API der zuständigen Versammlungsbehörden aus Köln, Hamburg, Düsseldorf, Leipzig und weiteren Städten wäre der entscheidende Fortschritt. Neue Quellen werden erst nach Format-, Aktualitäts-, Verfügbarkeits- und Rechteprüfung angeschlossen. Ein Aufzeichnungsvideo allein erzeugt niemals eine amtliche Versammlung.
