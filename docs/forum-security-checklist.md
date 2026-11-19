# Forumieren: Sicherheitseinstellungen für DemoRadar

Status: **Noch nicht im externen Forum gesetzt.** Die öffentliche GitHub-Integration hat keinen Zugriff auf das Forumieren-Admin-Konto.

1. **Registrierungsschutz**: Adminbereich → Nutzer & Gruppen → Nutzer → Nutzereinstellungen (Bezeichnungen können je nach Version abweichen). Prüfen, ob CAPTCHA/Anti-Bot-Schutz bereits eingebaut und aktiviert ist. Kein zusätzliches Skript ohne dokumentierte Unterstützung einfügen. Manuelle Mitgliederfreigabe in Forumieren separat kontrollieren; die frühere Discourse-Einstellung gilt nicht automatisch im Forumieren-Forum.
2. **Links/Beiträge neuer Mitglieder**: Adminbereich → Allgemeines → Forum → Sicherheit und/oder Nutzer & Gruppen → Gruppen / Berechtigungen. Verfügbare Einschränkungen für neue Mitglieder und Moderation vor Veröffentlichung prüfen. Kein bestimmtes 7-Tage-Linkverbot behaupten, wenn das Feature nicht nachgewiesen ist. Ggf. moderiertes Neumitgliederforum und Benutzergruppenrechte einsetzen.
3. **Beitragsmeldungen und Benachrichtigungen**: Laut offizieller Forumieren-Hilfe unter **Adminbereich → Allgemeines → Meldungsberichte → Einstellungen** aktivieren und Rechte festlegen. Die E-Mail-Benachrichtigungen und ggf. Toolbar-Benachrichtigungen im Admin-/Moderatorprofil prüfen.
   Quelle: https://hilfe.forumieren.com/t39590-phpbb2-wie-funktionieren-meldungsberichte
4. Einen Testaccount mit eingeschränkten Rechten verwenden und die Meldung eines Testbeitrags nachvollziehen, ohne reale Besucher zu beeinträchtigen.
5. Sicherstellen, dass Forumieren-Impressum/Datenschutz/Regeln verfügbar und Meldungen zeitnah bearbeitbar sind.

Empfehlung: Keine vollautomatischen Kontosperren auf Basis von Beschwerden oder Schlagwörtern. Nutzer müssen Fehlentscheidungen korrigieren lassen können. Automatisierte Verdachtsprüfung darf nur moderationsunterstützend sein.
