# Manuel — Instructeur

Vous êtes manager d'un domaine. Vous pouvez créer des cours, structurer leur contenu, inviter des apprenants, suivre les inscriptions et publier.

> Retour au [sommaire](index.md). Voir aussi le [manuel apprenant](learner.md) — un instructeur est aussi un apprenant.

## Sommaire

1. [Prérequis : être instructeur](#1-prérequis--être-instructeur)
2. [Créer un cours](#2-créer-un-cours)
3. [Structurer le cours](#3-structurer-le-cours)
4. [Les 8 types de blocs](#4-les-8-types-de-blocs)
5. [Gérer les inscriptions](#5-gérer-les-inscriptions)
6. [Inviter des apprenants](#6-inviter-des-apprenants)
7. [Publier ou dépublier](#7-publier-ou-dépublier)
8. [Cloner, exporter, supprimer](#8-cloner-exporter-supprimer)
9. [Analyses du cours](#9-analyses-du-cours)
10. [Vue admin : la liste des cours](#10-vue-admin--la-liste-des-cours)

---

## 1. Prérequis : être instructeur

Vous êtes instructeur si vous êtes **owner** ou **manager** d'un domaine. C'est l'admin du domaine qui vous a ajouté à la liste des managers (voir le [manuel admin](admin.md#3-gérer-les-managers)).

Les actions instructeur sont visibles sur les pages suivantes :

- Bouton « Créer un cours » en haut à droite de `/catalog`.
- Bouton « Liste » en haut à droite de `/catalog`, qui mène à `/course/list`.
- Petit crayon en haut à droite de chaque card de cours dans `/catalog` pour les cours que vous gérez.
- Tag « Publié » / « Brouillon » sur chaque card et sur `/course/<slug>` quand vous pouvez gérer.

![Screenshot : catalogue vu d'un instructeur](../screenshots/fr/instructor-01-catalog-instructor.png)

## 2. Créer un cours

Depuis le catalogue, cliquez sur « Créer un cours » en haut à droite. Vous arrivez sur `/course/new` :

![Screenshot : formulaire de création de cours](../screenshots/fr/instructor-02-course-create.png)

Champs obligatoires :

- **Domaine** — si vous gérez plusieurs domaines, choisissez le bon. Sinon, c'est pré-rempli.
- **Titre** (dans la langue principale du cours).
- **Slug** — généré automatiquement à partir du titre. Modifiable avant création, **figé après** (la stabilité des URLs prime sur la cosmétique).
- **Langue principale** — doit faire partie des langues autorisées du domaine.
- **Niveau** — Débutant / Intermédiaire / Avancé.
- **Mode d'inscription** :
  - **Libre** : tout membre du domaine peut s'inscrire en un clic.
  - **Sur validation** : les inscriptions partent en pending, à approuver une par une dans l'onglet « Inscriptions ».
  - **Sur invitation** : le cours est invisible dans le catalogue pour les membres sans invitation pendante.

Après création, vous arrivez sur `/course/<id>/edit`, le shell d'édition.

## 3. Structurer le cours

La page d'édition a 4 onglets :

- **Informations** — métadonnées (titre, description, objectifs, durée estimée, image de couverture). Saisie multilingue via les onglets de langue.
- **Structure** — sections + leçons + blocs. Drag-and-drop pour réordonner.
- **Inscriptions** — qui est inscrit, qui attend, invitations en cours.
- **Analyses** — KPIs et sparkline 30 jours.

![Screenshot : éditeur de cours, onglet Structure](../screenshots/fr/instructor-03-course-edit-structure.png)

### Hiérarchie

```
Cours
└── Section 1
    ├── Leçon 1.1
    │   ├── Bloc texte enrichi
    │   ├── Bloc vidéo
    │   └── Bloc quiz
    └── Leçon 1.2
└── Section 2
    └── ...
```

### Réordonner

Chaque niveau (sections, leçons, blocs) supporte le drag-and-drop. La poignée est à gauche de l'élément. L'ordre est persisté immédiatement.

### Édition par langue

Chaque leçon, section et bloc traduit (titre, description, contenu rich-text) est éditable par langue via des onglets en haut de l'éditeur de bloc. Un bouton « Traduire depuis l'onglet courant » remplit les champs vides d'une autre langue en copiant le contenu de la langue active (utile pour démarrer une traduction).

![Screenshot : éditeur de bloc avec onglets de langue](../screenshots/fr/instructor-04-block-translate.png)

### Aperçu apprenant

Un bouton œil dans l'éditeur de leçon ouvre l'aperçu côté apprenant (lecture seule, dans le contexte d'édition) pour vérifier le rendu.

## 4. Les 8 types de blocs

L'éditeur de leçon (`/lesson/<id>/edit`) propose 8 types de blocs. Cliquez sur « Ajouter un bloc » pour ouvrir le picker :

![Screenshot : picker de type de bloc](../screenshots/fr/instructor-05-block-picker.png)

| Type | Usage | Notes |
|------|-------|-------|
| **Texte enrichi** | Paragraphes formatés, listes, citations, code inline | Éditeur Quill — couleurs, alignements, etc. HTML sanitisé serveur-side. |
| **Image** | Illustration | Upload via fileupload PrimeNG. Pas de redimensionnement automatique. |
| **Vidéo** | YouTube / Vimeo / upload | URL auto-détectée. Le rendu est un iframe live dans l'éditeur. |
| **Fichier** | PDF, slides, doc | L'apprenant voit un lien de téléchargement. |
| **Quiz** | Quiz intégré | Picker auto-complete sur les `QuizTemplate` du domaine du cours, score minimal configurable. |
| **Encadré** | Note, avertissement, conseil | Couleur configurable. |
| **Code** | Snippet | Coloration syntaxique selon le langage. |
| **Intégration** | Iframe externe | À utiliser avec parcimonie (cookies tiers, RGPD). |

### Auto-sauvegarde

Chaque édition de bloc est sauvegardée automatiquement via PATCH debouncé (1 s d'inactivité). Un indicateur « Enregistré » apparaît en bas du bloc.

## 5. Gérer les inscriptions

Onglet « Inscriptions » de `/course/<id>/edit`.

![Screenshot : onglet Inscriptions](../screenshots/fr/instructor-06-enrollment-tab.png)

### Pour un cours sur validation

Les inscriptions arrivent en statut **En attente**. Boutons par ligne :

- **Approuver** — l'apprenant rejoint le cours, reçoit un email de confirmation.
- **Refuser** — la demande est rejetée, l'apprenant reçoit un email d'explication.

Filtre en haut pour ne voir que les pending, ou tout l'historique.

### Pour un cours sur invitation

Une section supplémentaire « Inviter un apprenant » s'affiche en haut, avec un picker auto-complete + un bouton « Envoyer ». Voir la section suivante.

## 6. Inviter des apprenants

Dans l'onglet « Inscriptions » d'un cours sur invitation.

![Screenshot : zone d'invitation](../screenshots/fr/instructor-07-invite-form.png)

### Inviter un ou plusieurs membres

1. Tapez 2+ caractères dans le picker. Les membres du domaine du cours apparaissent (ceux déjà inscrits ou déjà invités sont filtrés).
2. Sélectionnez un ou plusieurs membres (multi-select). Le bouton « Envoyer X invitations » s'adapte.
3. Cliquez. Toutes les invitations partent en une seule requête réseau, et n'incrémentent qu'un seul hit dans le bucket de throttle `lms_invite_send` (50/min par défaut).

Les destinataires reçoivent un email avec un lien unique vers `/course-invite/<token>`. Le lien expire dans 14 jours. Un rappel automatique est envoyé 3 jours avant expiration s'ils n'ont pas accepté.

### Liste des invitations en cours

Sous le formulaire d'invitation, une table liste toutes les invitations en cours pour ce cours :

- **Apprenant** + **Envoyée** + **Expire** + **Statut** + actions.
- **Renvoyer** par ligne — pousse `expires_at` à +14 jours et réinitialise le rappel J-3.
- **Révoquer** par ligne — annule l'invitation, l'apprenant ne peut plus l'accepter.

### Tout renvoyer

Si vous avez beaucoup d'invitations en cours (cohorte qui démarre en retard, par exemple), un bouton « Tout renvoyer » au-dessus de la table renvoie toutes les invitations en cours en un seul clic. Une ligne est ajoutée à l'audit log avec `processed` et `skipped`.

![Screenshot : bouton Tout renvoyer](../screenshots/fr/instructor-08-bulk-resend.png)

## 7. Publier ou dépublier

Un cours en mode **brouillon** est invisible au catalogue pour les non-instructeurs. Pour rendre visible : bouton œil (« Publier ») en haut à droite de la page d'édition.

![Screenshot : bouton publier/dépublier](../screenshots/fr/instructor-09-publish-toggle.png)

Le cours doit avoir au moins une section publiée avec au moins une leçon publiée pour pouvoir être publié — sinon le serveur renvoie une erreur explicite.

Une fois publié, l'icône bascule en « œil barré » (« Dépublier »). Dépublier ne supprime rien : les inscriptions existantes restent, mais le cours redevient invisible aux nouveaux apprenants.

Un tag « Brouillon » centré sous l'en-tête rappelle l'état tant que ce n'est pas publié (visible aussi sur la page de détail et sur les cards du catalogue pour les instructeurs).

## 8. Cloner, exporter, supprimer

Trois boutons à droite de l'en-tête de la page d'édition :

- **Dupliquer** — crée une copie complète (sections + leçons + blocs) en mode brouillon. Utile pour démarrer un nouveau cours à partir d'un template existant.
- **Exporter (JSON)** — télécharge le cours au format JSON portable. Le payload est ré-importable via un endpoint API.
- **Supprimer** — supprime définitivement le cours, ses sections, ses leçons, ses blocs, **et toutes les inscriptions des apprenants**. ⚠️ Si le cours a déjà émis des certificats, la suppression est bloquée (les certificats sont protégés en cascade).

![Screenshot : boutons cloner/exporter/supprimer](../screenshots/fr/instructor-10-clone-export-delete.png)

## 9. Analyses du cours

Onglet « Analyses » de `/course/<id>/edit`.

![Screenshot : onglet Analyses](../screenshots/fr/instructor-11-analytics.png)

KPIs surfaceés :

- **Inscriptions totales** + ventilation actives / en attente / annulées.
- **Taux de complétion** — % d'inscrits qui ont terminé.
- **Progression médiane** — où en est l'apprenant médian.
- **Certificats émis**.
- **Sparkline 30 jours** — nouvelles inscriptions par jour.

Pour les cours sur invitation, une sous-section ajoute :

- Invitations envoyées, acceptées, refusées, expirées.
- Taux d'acceptation.
- Temps médian d'acceptation.

## 10. Vue admin : la liste des cours

`/course/list` (bouton « Liste » en haut à droite du catalogue) — une table admin de tous les cours que vous gérez, brouillons inclus.

![Screenshot : /course/list](../screenshots/fr/instructor-12-course-list.png)

Colonnes : Titre, Domaine, Niveau, Mode d'inscription, Statut (Publié / Brouillon), Nombre de leçons, Actions.

Actions par ligne :

- Œil — ouvrir la page de détail.
- Crayon — éditer.

Actions groupées (sélection par checkbox) :

- **Publier** — publie en bloc.
- **Dépublier** — dépublie en bloc.
- **Supprimer** — supprime en bloc (confirmation requise, certificats protégés).

Paginator standard sous la table — page size 20.
