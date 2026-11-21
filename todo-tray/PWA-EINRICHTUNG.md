# Handy-App (PWA) einrichten

Die PWA liegt in `pwa/` und greift direkt über die Google-Drive-API auf denselben Ordner **To-Dos** zu wie die Windows-App. Du brauchst dafür einmalig ein Google-Cloud-Projekt (kostenlos) und einen Ort, an dem die Seite per HTTPS erreichbar ist (z. B. GitHub Pages).

Dauer: ca. 20 Minuten. Die Oberfläche von Google ändert sich gelegentlich, die Bezeichnungen unten sind der Stand von 2026 (früher: „OAuth-Zustimmungsbildschirm“ = jetzt „Google Auth Platform“).

## Teil 1: Google-Cloud-Projekt

1. Öffne https://console.cloud.google.com und melde dich mit dem Google-Konto an, dem der Ordner „To-Dos“ gehört.
2. Oben links auf die Projektauswahl → **Neues Projekt** → Name `To-Dos` → **Erstellen**. Danach das Projekt oben auswählen.
3. **Drive-API aktivieren:** Menü ☰ → **APIs und Dienste** → **Bibliothek** → „Google Drive API“ suchen → **Aktivieren**.
4. **Zustimmungsbildschirm einrichten:** Menü ☰ → **APIs und Dienste** → **OAuth-Zustimmungsbildschirm** (bzw. „Google Auth Platform“ → **Erste Schritte**).
   - App-Name: `To-Dos`, Support-E-Mail: deine Adresse.
   - Zielgruppe: **Extern**.
   - Kontakt-E-Mail: deine Adresse. Bedingungen akzeptieren, **Erstellen**.
5. **Testnutzer eintragen:** Unter **Zielgruppe** (bzw. „Testnutzer“) → **Add users** → beide Google-Adressen eintragen (deine und die des anderen Nutzers) → **Speichern**.
6. **Berechtigung hinzufügen:** Unter **Datenzugriff** (bzw. „Bereiche“) → **Bereiche hinzufügen oder entfernen** → `.../auth/drive` suchen bzw. unten manuell eintragen: `https://www.googleapis.com/auth/drive` → **Aktualisieren** → **Speichern**.
   - Warum der volle Drive-Bereich? Mit dem engeren `drive.file` sähe die App den bereits vorhandenen Ordner nicht. Der Zugriff ist durch die Testnutzer-Liste auf euch beide begrenzt.
7. **Client-ID erstellen:** **Clients** (bzw. „Anmeldedaten“ → **Anmeldedaten erstellen** → **OAuth-Client-ID**) → Anwendungstyp **Webanwendung** → Name `Aufgaben-PWA`.
   - **Autorisierte JavaScript-Quellen:** nur der Ursprung der Seite, ohne Pfad und ohne Schrägstrich am Ende, z. B. `https://DEINNAME.github.io`.
   - Weiterleitungs-URIs: leer lassen (nicht nötig).
   - **Erstellen** → die **Client-ID** kopieren (endet auf `.apps.googleusercontent.com`). Ein Client-Secret brauchst du nicht.
8. Trage die Client-ID in `pwa/config.js` ein:
   ```js
   window.TODO_CONFIG = { clientId: '1234-abcd.apps.googleusercontent.com', ordner: 'To-Dos' };
   ```
   Die Client-ID ist öffentlich und darf im Repo stehen.

## Teil 2: Veröffentlichen (GitHub Pages)

1. Den Inhalt von `pwa/` so ablegen, dass er unter einer HTTPS-Adresse erreichbar ist. Mit GitHub Pages: Repo → **Settings** → **Pages** → Branch `main`, Ordner `/` (oder `/docs`). Die App liegt dann z. B. unter `https://DEINNAME.github.io/REPO/pwa/`.
2. Die Adresse muss zum Ursprung aus Schritt 7 passen (`https://DEINNAME.github.io`).
3. Hinweis: Eine Datei `pwa/core.js` ist eine Kopie von `shared/core.js`. Nach Änderungen am Kern `npm run sync` ausführen (der Test `npm test` meldet, wenn die Kopie veraltet ist).

## Teil 3: Auf dem Handy

1. Ordner freigeben: In Google Drive den Ordner **To-Dos** für das Google-Konto des anderen Nutzers freigeben (Rolle **Bearbeiter**). Sein Konto muss auch in der Testnutzer-Liste stehen. Er legt sich zur Sicherheit eine Verknüpfung in „Meine Ablage“ an (Rechtsklick → **Verknüpfung hinzufügen**).
2. Seite im Handy-Browser öffnen:
   - **Android (Chrome):** ⋮ → **App installieren** bzw. **Zum Startbildschirm hinzufügen**.
   - **iPhone (Safari):** Teilen → **Zum Home-Bildschirm**.
3. App öffnen → **Mit Google anmelden**. Beim ersten Mal erscheint „Google hat diese App nicht überprüft“. Das ist normal bei Testnutzern: **Erweitert** → **Weiter zu To-Dos** und den Zugriff erlauben.
4. Den eigenen Namen wählen (derselbe wie in der Windows-App) und loslegen.

## Bedienung
- 📷 in einer Aufgabe: Foto aufnehmen oder Datei wählen, landet direkt in `dateien/<Aufgabe>/` im Drive-Ordner.
- 📥 Eingang: Fotos, die du direkt dort ablegst oder über die Drive-App in `eingang/` hochgeladen hast, einer Aufgabe zuordnen oder daraus eine neue Aufgabe machen.
- Board: seitlich wischen zwischen „Zu tun / In Arbeit / Fertig“.
- Die Liste aktualisiert sich alle 20 Sekunden und beim Öffnen. ⟳ lädt sofort neu.

## Bekannte Grenzen
- **Anmeldung im Testmodus:** Google lässt Testnutzer-Anmeldungen nach 7 Tagen verfallen. Die App fordert dann zum erneuten Anmelden auf (ein Tipp). Das lässt sich vermeiden, wenn du in der Google Auth Platform unter **Zielgruppe** → **Veröffentlichen** auf „In Produktion“ stellst. Für nur zwei Nutzer ist keine Prüfung nötig, es bleibt nur die Warnseite beim Anmelden.
- Die Sitzung gilt 1 Stunde und wird beim Öffnen/Aktualisieren still erneuert. Falls das der Browser blockiert, erscheint der Anmelde-Knopf.
- Keine Push-Nachrichten: neue Zuweisungen siehst du beim Öffnen der App (Hinweis unten). Push gäbe es nur mit einer APK (später möglich).
- Dateien aus der „Teilen“-Funktion anderer Apps landen nicht automatisch in der App: dafür die Drive-App mit Ziel `eingang` nutzen.
- Der Papierkorb von Drive fängt gelöschte Dateien auf (die App löscht nie endgültig).

## Problemlösung
| Meldung | Ursache |
| --- | --- |
| „Einrichtung fehlt …“ | `pwa/config.js` enthält noch die Platzhalter-ID |
| `origin_mismatch` / „Fehler 400“ beim Anmelden | Adresse der Seite passt nicht zur „Autorisierten JavaScript-Quelle“ (Schritt 7) |
| „Zugriff blockiert: nicht verifiziert“ | Konto nicht als Testnutzer eingetragen (Schritt 5) |
| „Ordner nicht gefunden“ | Ordner nicht für dieses Konto freigegeben oder Name in `config.js` abweichend |
| „Fehler: Drive 403“ | Drive-API nicht aktiviert (Schritt 3) oder Bereich `drive` fehlt (Schritt 6) |
