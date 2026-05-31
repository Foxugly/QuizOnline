# QuizOnline — Handleiding

Welkom. Deze handleiding behandelt de drie SaaS-rollen:

- **[Cursist](learner.md)** — de catalogus verkennen, inschrijven, een les volgen, een quiz afleggen, een certificaat behalen.
- **[Instructeur](instructor.md)** — een cursus maken, lessen structureren, cursisten uitnodigen, inschrijvingen en analytics volgen.
- **[Domeinbeheerder](admin.md)** — leden, talen en auditlog beheren, eigendom overdragen, meldingen configureren.

Elke rol erft de mogelijkheden van de lagere rol: een instructeur is ook een cursist, een domeinbeheerder is ook een instructeur.

## Rolhiërarchie

| Rol | Voornaamste mogelijkheden |
|-----|---------------------------|
| Cursist | De catalogus bekijken (zichtbare gepubliceerde cursussen), inschrijven (vrij / goedkeuring / uitnodiging), lessen volgen, quizzen afleggen, certificaten behalen. |
| Instructeur (= manager van een domein) | Alles wat een cursist kan, en daarnaast: cursussen aanmaken / bewerken / publiceren, structureren in secties + lessen + blokken, uitnodigen, analytics zien, inschrijvingen zien. |
| Domeinbeheerder (= eigenaar van het domein) | Alles wat een instructeur kan, en daarnaast: leden en managers van het domein beheren, toegestane talen wijzigen, het auditlog raadplegen, eigendom overdragen. |

Superusers (platformkant) worden niet behandeld in deze handleiding — hun dashboard staat onder `/admin/*`.

## Conventies

- Paden beginnen met een slash: `/catalog`, `/dashboard`, enz. Dat zijn routes van de Angular-SPA, geen absolute URL's.
- Namen van UI-componenten staan tussen aanhalingstekens: "Een cursist uitnodigen".
- Kritieke acties (verwijderen, overdragen, enz.) worden voorafgegaan door een uitdrukkelijke waarschuwing.
- Screenshots zijn 1280 px breed, lichte thema, Nederlandse UI.

## Snelstart

1. Log in via `/login` met je gebruikersnaam + wachtwoord (of via een magic link per e-mail).
2. Je komt op het **dashboard** (`/dashboard`) terecht, dat al je cursussen, certificaten, quizzen en openstaande uitnodigingen samenbrengt.
3. Open de sectie die bij jouw rol hoort om verder te gaan.

---

*Laatste update: zie de bijbehorende Git-commit.*
