# Großstadt-Quellenprüfung (Stand: 23.11.2026)

Diese Datei ist ein Rechercheprotokoll, **kein Importfreigabevermerk**. Diagnosewerte stammen aus `data/source-coverage.json` (Fenster 24.10.–30.11.2026); sie sind keine vollständigen Veranstaltungssummen. „Nicht separat erfasst“ ist nicht „0 Demonstrationen“. Für keine der neu recherchierten Seiten wurden automatisierte Wiederverwendungsrechte, stabile Event-IDs und ein maschinenlesbarer Terminkatalog bestätigt. **Keine automatischen Imports freigeben.**

| Stadt | Diagnose-Einträge | Offizieller Befund | Wiederverwendung / technische Eignung | Nächster Schritt |
|---|---:|---|---|---|
| Berlin | 360 | Bereits im Diagnosekatalog | Quellenqualität getrennt prüfen | Bestehenden Import validieren |
| Hamburg | 0 | Amtliche Informationsseiten, keine verifizierte öffentliche Terminliste | Ungeklärt / kein bestätigter Feed | Bei Versammlungsbehörde anfragen |
| München | nicht separat erfasst | [KVR: Anzeige einer Versammlung](https://stadt.muenchen.de/service/info/kreisverwaltungsreferat/1063788/) ist ein Anmeldeverfahren, keine Terminliste | Ungeklärt / kein bestätigter Feed | KVR nach öffentlich nutzbarer Terminquelle fragen |
| Köln | 5 | Diagnose-Einträge vorhanden | Weitere Prüfung erforderlich | Datenherkunft und Änderungen prüfen |
| Frankfurt am Main | 2 | Quelle laut Diagnose HTTP-eingeschränkt | Rechte ungeklärt | Alternative amtliche Quelle prüfen |
| Stuttgart | 1 | Diagnose-Eintrag vorhanden | Rechte/Feed ungeklärt | Zuständige Behörde recherchieren |
| Düsseldorf | 0 | [Stadt: Versammlungen sind Polizeisache](https://www.duesseldorf.de/veranstaltungsmanagement); [Serviceportal](https://service.duesseldorf.de/suche/-/vr-bis-detail/dienstleistung/385/show) verweist an Polizei | Ungeklärt / kein bestätigter Feed | Polizeipräsidium nach veröffentlichbaren Terminen fragen |
| Leipzig | 3 | Diagnose meldet Beobachtungsseiten, keinen verifizierten Feed | Ungeklärt | Quelle validieren |
| Dortmund | 1 | Diagnose-Eintrag vorhanden | Ungeklärt | Polizeiliche/amtliche Quelle recherchieren |
| Essen | nicht separat erfasst | Noch keine bestätigte Terminquelle | Ungeklärt | Zuständigkeit und Feed recherchieren |
| Bremen | 0 | Polizei-Pressearchiv laut Diagnose HTTP-eingeschränkt | Ungeklärt / kein Feed bestätigt | Alternative amtliche Quelle suchen |
| Dresden | nicht separat erfasst | [Amtliche Versammlungsübersicht](https://www.dresden.de/versammlungen) laut städtischem Wegweiser täglich bis 8 Uhr aktualisiert, drei Monate Vorschau; direkter Abruf am 23.11.2026 mit HTTP 503 fehlgeschlagen | Öffentliche HTML-Übersicht dokumentiert, maschinenlesbarer Feed und Wiederverwendungsrechte **nicht bestätigt** | Abrufbarkeit, Nutzungsbedingungen, Datums-/Absagefelder prüfen; kein Import |
| Hannover | nicht separat erfasst | [Städtische FAQ](https://www.hannover.de/Leben-in-der-Region-Hannover/Verwaltungen-Kommunen/Die-Verwaltung-der-Landeshauptstadt-Hannover/Dezernate-und-Fachbereiche-der-LHH/Jugend%2C-Familie-Sport/Fachbereich-Sport%2C-B%C3%A4der-und-Eventmanagement/Veranstaltungsservice-der-Landeshauptstadt-Hannover/%C3%96ffentliche-Veranstaltungen-in-Hannover-planen-und-anmelden) nennt Polizeidirektion als zuständig | Ungeklärt / kein bestätigter Feed | Polizeidirektion nach Termindaten fragen |
| Nürnberg | 1 | Diagnose-Eintrag vorhanden | Ungeklärt | Amtliche Quelle prüfen |
| Duisburg | nicht separat erfasst | Noch keine bestätigte Terminquelle | Ungeklärt | Zuständigkeit und Feed recherchieren |

## Freigabekriterien

1. Offizielle oder nachweislich autorisierte Quelle mit tatsächlichen Versammlungsterminen (nicht nur Anmeldeformular, Archiv oder Presseindex).
2. Nachweisbare kostenlose Wiederverwendungsbefugnis und Beachtung personenbezogener Daten.
3. Stabile Terminidentifikation, Datum/Ort/Quelle, Umgang mit Absagen und Änderungen.
4. Verlässliche technische Abrufbarkeit, konservative Rate-Limits und Tests mit echten belegbaren Beispielen.
5. Keine Schätzung fehlender Termine; leere Diagnosen nie als „keine Demonstrationen“ darstellen.

## Regressionsprüfung vor Importfreigabe

- Alle 15 Städte in dieser Tabelle dokumentiert; jeder Status unterscheidet recherchierte Quelle und importierbare Termine.
- Keine neue Stadt erhält allein wegen einer Anmelde- oder Presseseite den Status „automatisch importierbar“.
- Bestehende DemoRadar-Daten und die Website bleiben durch diese Dokumentation unverändert.

## Reproduzierbarer CI-Fehler am 23.11.2026

PR #51, Workflow „Source transparency checks“, Run 45151803654: `scripts/test-source-monitor.py` Zeile 73 schlug fehl, weil die Weimar-Testdaten vom 22.–25.11.2026 mit dem echten aktuellen UTC-Datum geprüft wurden. Die Produktionslogik soll weiterhin vergangene Termine ausschließen. Der Test verwendet nun für die drei festen Weimar-Fixtures explizit den 20.11.2026; der optionale `today`-Parameter in `inspect` wird standardmäßig weiterhin aus der aktuellen UTC-Zeit bestimmt. Kein Ereignisimport geändert.

## Amtliche Quellen-Nachprüfung am 23.11.2026 (nur Recherche, keine Importfreigabe)

### Rostock
- **Originalübersicht:** https://rathaus.rostock.de/sixcms/detail.php/rostock_01_test.c.343355.de — die offizielle Seite war öffentlich lesbar und zeigte konkrete Versammlungen vom 23. und 25.11.2026 mit Motto, Beginn, Ende, beantragtem/beschiedenem Streckenverlauf und Status (z. B. `beschieden`). **Nicht alle Statuswerte sind als Durchführung oder Absage interpretierbar.**
- **Amtlich dokumentierter RSS:** https://rathaus.rostock.de/sixcms/list.php?page=rss_seite_versammlung_de — im Städtischen Anzeiger vom 30.04.2022 ausdrücklich als RSS für Neueintragungen genannt (https://rathaus.rostock.de/sixcms/media.php/rostock_01.a.11071.de/datei/St%C3%8420220430.pdf). Direkter Abruf über die Rechercheumgebung am 23.11.2026: Cache-Miss; **RSS-XML, IDs, GUID-Stabilität, Update- und Löschsemantik daher nicht verifiziert**.
- **Recht:** Die Veröffentlichung und das RSS-Angebot sind kein ausdrücklicher Nachweis, dass Drittanbieter Daten automatisiert vervielfältigen, dauerhaft speichern oder weiterveröffentlichen dürfen. Eine eindeutige Nutzungsfreigabe liegt nicht vor. Keine personenbezogenen Angaben der Anmeldenden übernehmen.
- **Importentscheidung:** gesperrt bis ausdrückliche Wiederverwendungsfreigabe, XML-Abruf und belastbare Tests für Änderungen/Absagen/Zeitzonen.

### Jena
- **Originalseite:** https://rathaus.jena.de/de/auflagen-aktueller-veranstaltungen — offizielles Rathausportal mit öffentlichen Versammlungen, Zeitpunkt, Ort und verlinkten Informations-PDFs. Die Stadt begründet die Veröffentlichung mit dem Thüringer Transparenzgesetz. Am 23.11.2026 waren unter anderem Einträge für den 25.11.2026 sichtbar.
- **Technik:** gemischter Katalog von Veranstaltungen und Versammlungen; die Kategorie muss zwingend geprüft werden. HTML-Termin- und Ortsfelder sind vorhanden, PDF kann zusätzliche Auflagen enthalten. Stabile IDs, Absage- und Änderungssemantik und maschinenlesbarer Feed nicht nachgewiesen.
- **Recht:** Die Entscheidung der Stadt zur öffentlichen Anzeige ist **keine ausdrückliche Drittanbieter-Reuse-Lizenz**. Kein Import ohne Klärung.

### Dresden
- **Amtlicher Nachweis:** https://www.dresden.de/media/pdf/amtsblatt/2024/gedruckte-ausgabe/Wegweiser-Rathaus-2024.pdf — städtische Beschreibung der täglich bis 8 Uhr aktualisierten Dreimonatsübersicht; sehr kurzfristige Versammlungen und Streiks können fehlen, Durchführung ist nicht garantiert.
- **Abruf:** https://www.dresden.de/versammlungen lieferte bei der Recherche am 23.11.2026 HTTP 503. Damit weder aktuelle Datensätze noch strukturierte Datums-, Orts-, Absagefelder belastbar geprüft. Wiederverwendungsrechte nicht nachgewiesen.

### Weitere priorisierte Städte
München, Düsseldorf, Hannover, Dortmund, Stuttgart und Bremen: Keine neu verifizierte Kombination aus öffentlich abrufbarem Terminfeed, stabilen IDs, nachvollziehbarer Absagesemantik und ausdrücklicher Wiederverwendungsfreigabe. Bestehende Rechercheeinträge bleiben ohne Importberechtigung.

### Regressionen vor späterer Freigabe (verbindlich)
1. Nur als Versammlungen klassifizierte Einträge; Veranstaltungen, Presse-Rückblicke und Anmeldeformulare werden ausgeschlossen.
2. Terminbeginn/-ende inklusive Europe/Berlin-Zeitzone valide; kein Datum aus einem Titel erraten.
3. Quelle/Original-URL und stabile Event-ID nachweisen; gleiche Veranstaltung darf nicht dupliziert werden.
4. RSS-Neueintrag ≠ Statusänderung oder Absage; Änderungen und Löschungen dürfen nicht ohne amtlichen Nachweis als Absage gelten.
5. Persönliche Anmelderdaten nicht übernehmen; Quellenrechte explizit belegen.
6. HTTP 403/429/503, XML-Fehler und fehlende Pflichtfelder führen zu **keinem** fiktiven oder ungeprüften Ereignis.
