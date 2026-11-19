# DemoRadar-Meldecenter – Aktivierungsanleitung

**Code implementiert, aber standardmäßig deaktiviert.** Die Seiten /melden/ und /en/report/ zeigen bis zur technischen Aktivierung einen direkten GitHub-Ersatzlink. Keine Meldung geht verloren, weil das neue Formular vor Aktivierung nicht angezeigt wird.

## Architektur und Verhalten

- Frontend: `/melden/` (deutsch), `/en/report/` (englisch).
- Backend: Cloudflare Pages Function `/api/report` (GET=Status, POST=Fehlermeldung).
- Besucher brauchen kein GitHub-Konto.
- Freies Textfeld, URL, Kategorie und optionaler Nachweis; öffentlich eingereichte Inhalte dürfen keine sensiblen Daten enthalten.
- Schutz durch serverseitige Turnstile-Prüfung, Honeypot, Längen- und Formatvalidierung.
- Nach erfolgreicher Prüfung erstellt der Server ein **öffentliches GitHub-Issue mit Titelpräfix `[Fehler]`** im Repository `PuntaCanada/demoradar`. Die bestehende stündliche Prüfroutine kann diese neuen Issues sichten. Dabei keine automatischen Kontosperren.
- GitHub-Tokens und Turnstile-Secret werden **nicht** im Client gespeichert.
- Vor dem öffentlichen Start zusätzliche Cloudflare-Rate-Limit-Regel für `/api/report` prüfen (z. B. wenige POST-Anfragen pro IP und Stunde; nur wenn im Free-Plan verfügbar). Vor DoS nicht vollständig geschützt.
- **Keine Garantie auf datenschutzrechtliche Compliance:** Datenschutz- und Speicherhinweise einschließlich GitHub als öffentlichem Empfänger prüfen.

## Aktivieren (einmalig im Cloudflare-Konto)

1. Unter Cloudflare **Turnstile** ein kostenloses Widget für die tatsächliche(n) DemoRadar-Domain(s) anlegen. `demoradar.pages.dev` und ggf. später Custom-Domain in der Widget-Hostliste freigeben. Site Key und Secret Key getrennt notieren.
2. In GitHub ein **fine-grained Personal Access Token** ausschließlich für `PuntaCanada/demoradar` erstellen, Repository-Berechtigung **Issues: Read and write** (minimal erforderliche Berechtigung), kurze Laufzeit und sichere Rotation. GitHub kann dazu zusätzliche Repository-Metadaten erlauben.
3. In **Cloudflare → Workers & Pages → DemoRadar Pages-Projekt → Settings → Variables and Secrets** folgende drei Variablen setzen:
   - `TURNSTILE_SITE_KEY` = öffentlicher Site Key
   - `TURNSTILE_SECRET_KEY` = als Secret (vertraulich)
   - `GITHUB_ISSUES_TOKEN` = als Secret (vertraulich)
4. Deployment erneut auslösen, wenn Cloudflare Änderungen der Variablen nicht automatisch übernommen hat.
5. Öffne `https://demoradar.pages.dev/api/report`. Bei erfolgreicher Aktivierung sollte `{"enabled":true,"sitekey":"..."}` zurückkommen. **Keine Secret Keys in Screenshots oder Chat senden.**
6. `https://demoradar.pages.dev/melden/` öffnen, ein harmloses **Test-Issue** mit `https://demoradar.pages.dev/` als betroffener Link erstellen, dann Issue kontrollieren und schließen. Testen: ohne CAPTCHA, ungültige URL, leere Beschreibung → Ablehnung.
7. Die Cloudflare-Logs für das neue API-Endpoint und GitHub-Issue-Monitoring prüfen.

## Wichtige Einschränkungen

- Der neue Endpunkt ist erst nach Einrichtung von Cloudflare-Variablen tatsächlich funktionsfähig.
- GitHub-Issues sind öffentlich und werden vom technischen GitHub-Konto erstellt; Meldende können sie nicht selbst nachträglich editieren.
- Keine IP-Adressen oder Passwörter werden durch diese Funktion absichtlich in Issues geschrieben. Cloudflare und GitHub haben eigene technische Protokolle.
- Starke Abuse-Abwehr benötigt zusätzliche Rate-Limits. Bei Missbrauch ggf. Endpoint deaktivieren, Schlüssel rotieren.
- Forumieren wird hier **nicht** mit automatischen Sperren angesteuert.
