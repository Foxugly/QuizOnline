# Manuel d'utilisation — QuizOnline

Bienvenue. Ce manuel couvre les trois rôles côté SaaS :

- **[Apprenant](learner.md)** — découvrir le catalogue, s'inscrire, suivre une leçon, passer un quiz, obtenir un certificat.
- **[Instructeur](instructor.md)** — créer un cours, structurer les leçons, inviter des apprenants, suivre les inscriptions et les analyses.
- **[Admin de domaine](admin.md)** — gérer les membres, les langues, l'audit log, transférer la propriété, configurer les notifications.

Chaque rôle hérite des capacités du rôle plus restreint : un instructeur est aussi un apprenant, un admin est aussi un instructeur.

## Hiérarchie des rôles

| Rôle | Capacités principales |
|------|----------------------|
| Apprenant | Consulter le catalogue (cours publiés visibles), s'inscrire (libre/validation/invitation), suivre des leçons, passer des quiz, obtenir des certificats. |
| Instructeur (= manager d'un domaine) | Tout ce qu'un apprenant peut faire, plus : créer/éditer/publier des cours, structurer en sections + leçons + blocs, inviter, voir les analyses, voir les inscriptions. |
| Admin de domaine (= owner du domaine) | Tout ce qu'un instructeur peut faire, plus : gérer les membres et les managers du domaine, modifier les langues autorisées, consulter l'audit log, transférer la propriété. |

Les superusers (côté plate-forme) ne sont pas couverts par ce manuel — leur tableau de bord vit sous `/admin/*`.

## Conventions de ce manuel

- Les chemins commencent par un slash : `/lms/catalog`, `/dashboard`, etc. Ce sont des routes du SPA Angular, pas des URLs absolues.
- Les noms des composants UI sont entre guillemets : « Inviter un apprenant ».
- Les actions critiques (suppression, transfert, etc.) sont précédées d'un avertissement explicite.
- Les screenshots sont rendus à 1440 px de large, light theme, langue FR.

## Démarrage rapide

1. Connectez-vous via `/login` avec votre email + mot de passe (ou via un magic-link envoyé par email).
2. Vous arrivez sur le **dashboard** (`/dashboard`) qui agrège vos cours, certificats, quiz et invitations en attente.
3. Ouvrez la rubrique correspondant à votre rôle ci-dessus pour la suite.

---

*Dernière mise à jour : voir le commit Git correspondant.*
