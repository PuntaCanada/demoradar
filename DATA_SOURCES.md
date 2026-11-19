# DemoRadar – Datenquellen, Nutzung und Qualität

Stand: 19. November 2026

## Produktiv angebundene Quellen

- **Berlin:** `https://www.berlin.de/polizei/service/versammlungsbehoerde/versammlungen-aufzuege/index.php/index/all.json?q=`. Amtliche Meldeliste der Versammlungsbehörde. Die Lizenz für eine über die Anzeige einzelner Fakten hinausgehende Weiterverwendung wurde nicht abschließend verifiziert. Quelle auf jedem Termin verlinken.
- **Rostock:** `https://rathaus.rostock.de/de/versammlungen/343356?r=artikellink`. Amtliche HTML-Übersicht. Detailangaben und Route nur übernehmen, wenn sie zuordenbar sind. Nutzungsbedingungen zur systematischen Weiterverwendung gesondert prüfen.
- **Dresden:** `https://www.dresden.de/data_ext/versammlungsuebersicht/Versammlungen.json`. Strukturierte amtliche JSON-Übersicht, automatischer Import. Abgemeldete, abgesagte oder zurückgezogene Veranstaltungen werden nicht als bevorstehende Termine gezeigt. Die Tatsache, dass ein Endpoint abrufbar ist, bedeutet nicht automatisch eine unbeschränkte Datenlizenz. Herkunft pro Eintrag anzeigen.
- **Jena:** `https://rathaus.jena.de/de/auflagen-aktueller-veranstaltungen`. Nur eindeutig als Versammlung kategorisierte Einträge, sofern Datum und Uhrzeit aus der Quelle sicher auslesbar sind.

## Recherchierte, noch nicht produktiv angebundene Quelle

- **Demos Berlin e. V.** wurde nach Prüfung des dokumentierten API-Schemas und echter Stichproben produktiv als gesondert lizenzierter Datenbestand ergänzt (Details unten).

## Neu: Demos Berlin e. V. – bundesweite Ergänzung

- API: `https://api.demonstrations.org/v1/event/all` (öffentliches dokumentiertes POST-Abfrageformat, OpenAPI 3.1).
- Lizenz: **Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0 (CC BY-SA 4.0)**; Herausgeber [Demos Berlin e. V.](https://demonstrations.org/en/data); [Lizenztext](https://creativecommons.org/licenses/by-sa/4.0/).
- Der Demos-Bestand liegt bewusst getrennt in `data/demos-events.json`; diese Datei enthält Quellennachweis, Lizenzinformationen und eine Kennzeichnung als nicht amtlich bestätigte Meldung.
- Die Website ergänzt den amtlichen Kalender clientseitig mit den neuen Meldungen, bevorzugt bei eindeutig gleichen Veranstaltungen die amtliche Version und zeigt die Datenherkunft an.
- Sicherheitsfilter: maximal 120 Tage Zukunft, gültiges Datum, genau eine eindeutig identifizierte deutsche Stadt, keine erfundene Bundeslandangabe; fehlende oder widersprüchliche Endzeit wird ignoriert.
- Die API ist eine **zusätzliche Community-/Quellenübersicht** und kein amtlicher Nachweis, dass Veranstaltungen stattfinden. Die dortigen Uhrzeiten können amtlichen Angaben widersprechen; amtliche Originalquelle bevorzugen.
- Für das weitere Veröffentlichen bzw. Bearbeiten dieser CC-BY-SA-Daten müssen attribution und ShareAlike-Bedingungen beachtet werden. Dies ist keine pauschale Freigabe der anderen amtlichen Quellendaten.

## Neue Erschließung ab November 2026 – NRW und amtliche Kandidatenquellen

### Köln (Nordrhein-Westfalen) – vorsichtiger Faktenimport

- Amtliche Quelle: https://www.stadt-koeln.de/leben-in-koeln/verkehr/verkehrskalender/index.html
- Die Stadt veröffentlicht **ausgewählte** verkehrsrelevante Demonstrationen und Aufzüge, teilweise mit Zeit, Veranstaltungsort und Strecke. Dies ist **keine vollständige Versammlungsübersicht**.
- `scripts/update-cologne.py` untersucht ausschließlich passende, intern verlinkte Detailseiten der offiziellen Stadt-Website; nur ein eindeutig erkennbares Veranstaltungsdatum sowie eine Beginnzeit erlauben einen Kalendereintrag. Politische Hintergründe, Routen und Veranstalter werden niemals ergänzt, wenn sie nicht unmittelbar belegt sind.
- Der Import beschränkt sich auf einzelne sachliche Terminfakten und einen Originalquellen-Link. Es werden **keine** Artikeltexte, Bilder, Pläne oder PDFs kopiert.
- Für die HTML-Seiten des kommunalen Verkehrskalenders konnte **keine allgemeine offene Massendatenlizenz abschließend bestätigt werden**; daraus folgt ausdrücklich **keine** Freigabe zur Weiterverwertung kreativer Texte oder Bilder. Ein weitergehender Datenimport wäre erst nach Lizenzklärung zulässig.
- Fehlende/mehrdeutige oder temporär nicht erreichbare Seiten werden übersprungen. Ein verschwundener Eintrag beweist keine Absage; vorhandene Einträge bleiben kurzzeitig erhalten.

### Weitere beobachtete Kandidaten (noch **keine** automatischen Kalenderimporte)

- Nürnberg (Bayern): Amtliche Pressemitteilungen der Stadt zu einzelnen geplanten Versammlungen; nur Link und Erreichbarkeit, keine verifizierte vollständig strukturierte Veranstaltungsliste.
- Leipzig (Sachsen): Einsatzbezogene Polizeimeldungen, darunter teils gemeldete Routenänderungen; keine vollständige amtliche Zukunftsübersicht.
- Hamburg: Online-Angebot zur Versammlungsanmeldung, aber **keine** bestätigte öffentliche Liste künftiger angemeldeter Versammlungen.
- `scripts/monitor-official-sources.py` prüft die amtlichen Quellenseiten in jedem regelmäßigen GitHub-Lauf und veröffentlicht `data/expansion-sources.json`. **Erreichbarkeit ≠ verifizierter Datenfeed und ≠ Wiederveröffentlichungsrecht.**
- Alle Quellen werden ohne neue API-Abos, Datenbank oder kostenpflichtige Kartendienste geprüft.

## Qualitätsregeln

1. Zeit, Titel, Stadt und Veranstaltungsdatum niemals erfinden.
2. Bei Ausfall einer Quelle die letzten gültigen Meldungen erhalten, nicht durch einen leeren Datenbestand ersetzen.
3. Einfache Dubletten nur bei übereinstimmender Stadt, Datum, exaktem normalisierten Titel und Startzeit zusammenführen; widersprüchliche konkrete Veranstaltungsorte nicht zusammenführen. Prüffälle in `scripts/test-dedupe.py`.
4. Angemeldete Teilnehmerzahlen **nicht** als tatsächlich erschienene Personen ausgeben.
5. Quellenlink und behördlichen Status angeben. „Angezeigt“ oder „beschieden“ bestätigt weder Durchführung noch tatsächliche Teilnehmerzahl.
6. Keine politisch wertende Gewichtung oder automatische Behauptung einer Parteiveranstalterschaft allein wegen eines Schlagworts im Titel.
7. Verfügbarkeit einer API und Lizenzbedingungen nicht gleichsetzen. Weitere Quellen erst nach überprüftem Format und Rechteprüfung automatisch freischalten.

## Infrastruktur

GitHub Actions alle 6 Stunden; Daten als statisches JSON auf GitHub und Cloudflare Pages. Keine zusätzlichen kostenpflichtigen Dienste.
