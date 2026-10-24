# Reihenzähler (Pop-it)

Reihen zählen durch Drücken von Blasen wie bei einem Pop-it. Eigenständige App der Sammlung, nutzt `../shared/` (CD, Logo, `Store('zaehler')`).

- Jede Blase = eine Reihe. Tipp auf eine Blase drückt sie ein (+1), Tipp auf eine gedrückte Blase lässt sie wieder hoch (−1).
- „Reihe fertig“ drückt die nächste freie Blase, „− 1“ nimmt die zuletzt gedrückte zurück (auch über eine Umdrehung hinweg).
- Ist die Platte voll, dreht sie sich um und alle Blasen sind wieder oben; gezählt wird weiter.
- Einstellungen: Blasen pro Platte (6–30, Standard 10), optionales Ziel mit Fortschrittsbalken, Stand von Hand setzen, Zurücksetzen, Plopp-Geräusch und Vibration.
- Gespeichert unter `zaehler.state` im `localStorage`.
