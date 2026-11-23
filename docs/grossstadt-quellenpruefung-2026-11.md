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
| Dresden | nicht separat erfasst | Noch keine bestätigte Terminquelle | Ungeklärt | Zuständigkeit und Feed recherchieren |
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
