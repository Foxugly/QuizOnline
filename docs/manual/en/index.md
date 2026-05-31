# QuizOnline — User Manual

Welcome. This manual covers the three SaaS-side roles:

- **[Learner](learner.md)** — explore the catalog, enroll, follow a lesson, take a quiz, earn a certificate.
- **[Instructor](instructor.md)** — create a course, structure lessons, invite learners, monitor enrollments and analytics.
- **[Domain admin](admin.md)** — manage members, languages, audit log, transfer ownership, configure notifications.

Each role inherits the capabilities of the lower role: an instructor is also a learner, a domain admin is also an instructor.

## Role hierarchy

| Role | Main capabilities |
|------|-------------------|
| Learner | Browse the catalog (visible published courses), enroll (free / approval / invitation), follow lessons, take quizzes, earn certificates. |
| Instructor (= manager of a domain) | Everything a learner can do, plus: create / edit / publish courses, structure into sections + lessons + blocks, invite, see analytics, see enrollments. |
| Domain admin (= owner of the domain) | Everything an instructor can do, plus: manage members and managers of the domain, edit allowed languages, view the audit log, transfer ownership. |

Superusers (platform-side) are not covered by this manual — their dashboard lives under `/admin/*`.

## Conventions

- Paths start with a slash: `/catalog`, `/dashboard`, etc. These are Angular SPA routes, not absolute URLs.
- UI component names are quoted: "Invite a learner".
- Critical actions (deletion, transfer, etc.) are preceded by an explicit warning.
- Screenshots are rendered at 1280 px wide, light theme, English UI.

## Quick start

1. Log in via `/login` with your username + password (or via a magic link emailed to you).
2. You land on the **dashboard** (`/dashboard`) which aggregates your courses, certificates, quizzes, and pending invitations.
3. Open the section matching your role above to continue.

---

*Last updated: see the matching Git commit.*
