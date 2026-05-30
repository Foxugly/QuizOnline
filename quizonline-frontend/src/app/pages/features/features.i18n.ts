import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type FeatureItem = {
  icon: string;
  title: string;
  description: string;
};

export type FeatureSection = {
  slug: string;
  icon: string;
  badge: string;
  title: string;
  intro: string;
  features: FeatureItem[];
};

export type FeaturesUiText = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: FeatureSection[];
};

type SectionDef = {
  slug: string;
  icon: string;
  features: ReadonlyArray<{key: string; icon: string}>;
};

const SECTION_DEFS: ReadonlyArray<SectionDef> = [
  {
    slug: 'domains',
    icon: 'pi-th-large',
    features: [
      {key: 'roles', icon: 'pi-users'},
      {key: 'policies', icon: 'pi-key'},
      {key: 'requests', icon: 'pi-user-plus'},
      {key: 'bulkModeration', icon: 'pi-check-square'},
      {key: 'multiInvite', icon: 'pi-share-alt'},
      {key: 'analytics', icon: 'pi-chart-bar'},
      {key: 'transferOwnership', icon: 'pi-arrow-right-arrow-left'},
      {key: 'auditLog', icon: 'pi-history'},
      {key: 'notifications', icon: 'pi-envelope'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'languageGate', icon: 'pi-filter'},
    ],
  },
  {
    slug: 'subjects',
    icon: 'pi-tags',
    features: [
      {key: 'crud', icon: 'pi-folder-open'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'tagging', icon: 'pi-link'},
      {key: 'autoCreate', icon: 'pi-bolt'},
    ],
  },
  {
    slug: 'questions',
    icon: 'pi-question-circle',
    features: [
      {key: 'multipleChoice', icon: 'pi-list'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'images', icon: 'pi-image'},
      {key: 'videos', icon: 'pi-video'},
      {key: 'youtube', icon: 'pi-youtube'},
      {key: 'modes', icon: 'pi-flag'},
      {key: 'explanations', icon: 'pi-info-circle'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'importExport', icon: 'pi-file-import'},
      {key: 'duplicate', icon: 'pi-clone'},
    ],
  },
  {
    slug: 'quizzes',
    icon: 'pi-stopwatch',
    features: [
      {key: 'modes', icon: 'pi-bolt'},
      {key: 'timer', icon: 'pi-clock'},
      {key: 'window', icon: 'pi-calendar'},
      {key: 'visibility', icon: 'pi-eye'},
      {key: 'notifyUnlock', icon: 'pi-bell'},
      {key: 'shuffle', icon: 'pi-sort-alt'},
      {key: 'public', icon: 'pi-globe'},
      {key: 'assignment', icon: 'pi-send'},
      {key: 'emails', icon: 'pi-envelope'},
      {key: 'messages', icon: 'pi-comments'},
      {key: 'scoring', icon: 'pi-chart-line'},
      {key: 'pdf', icon: 'pi-file-pdf'},
      {key: 'tracking', icon: 'pi-history'},
    ],
  },
  {
    slug: 'learning',
    icon: 'pi-graduation-cap',
    features: [
      {key: 'catalog', icon: 'pi-th-list'},
      {key: 'structure', icon: 'pi-sitemap'},
      {key: 'blocks', icon: 'pi-th-large'},
      {key: 'editor', icon: 'pi-pencil'},
      {key: 'calloutVariants', icon: 'pi-palette'},
      {key: 'translations', icon: 'pi-language'},
      {key: 'viewAsLearner', icon: 'pi-eye'},
      {key: 'publish', icon: 'pi-send'},
      {key: 'safeHtml', icon: 'pi-shield'},
      {key: 'multilingual', icon: 'pi-globe'},
    ],
  },
  {
    slug: 'enrollment',
    icon: 'pi-id-card',
    features: [
      {key: 'modes', icon: 'pi-key'},
      {key: 'invites', icon: 'pi-user-plus'},
      {key: 'progress', icon: 'pi-chart-line'},
      {key: 'validationQuiz', icon: 'pi-check-square'},
      {key: 'finalQuiz', icon: 'pi-flag'},
      {key: 'certificates', icon: 'pi-file-pdf'},
      {key: 'verification', icon: 'pi-search-plus'},
      {key: 'emails', icon: 'pi-envelope'},
      {key: 'analytics', icon: 'pi-chart-bar'},
      {key: 'dashboard', icon: 'pi-home'},
    ],
  },
  {
    slug: 'platform',
    icon: 'pi-cog',
    features: [
      {key: 'auth', icon: 'pi-shield'},
      {key: 'magicLink', icon: 'pi-link'},
      {key: 'notificationPrefs', icon: 'pi-bell'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'outbox', icon: 'pi-inbox'},
      {key: 'dashboard', icon: 'pi-chart-bar'},
      {key: 'diagnostics', icon: 'pi-server'},
      {key: 'rateLimit', icon: 'pi-lock'},
      {key: 'api', icon: 'pi-code'},
    ],
  },
];

type FeatureContent = {title: string; description: string};
type SectionContent = {
  badge: string;
  title: string;
  intro: string;
  features: Record<string, FeatureContent>;
};
type FeaturesContent = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: Record<string, SectionContent>;
};

const FR_CONTENT: FeaturesContent = {
  eyebrow: 'Plateforme',
  title: 'Tout pour concevoir des quiz qui comptent',
  intro: 'De la structure organisationnelle aux résultats détaillés, QuizOnline rassemble la création de contenu, la diffusion et le suivi dans un seul produit pensé multilingue.',
  ctaPrimary: 'Créer un compte',
  ctaSecondary: 'Se connecter',
  ctaLoggedIn: 'Voir mes quiz',
  sections: {
    domains: {
      badge: 'Domaines',
      title: 'Organisez vos contenus par domaine',
      intro: 'Donnez à chaque entité son espace, ses rôles et ses règles. Les domaines structurent toute la plateforme.',
      features: {
        roles: {title: 'Hiérarchie de rôles', description: 'Owner, gestionnaires et membres avec des permissions adaptées à chaque niveau.'},
        policies: {title: 'Politiques d\'adhésion', description: 'Approbation automatique, par le propriétaire ou par les gestionnaires : trois modes au choix.'},
        requests: {title: 'Demandes en libre-service', description: 'Workflow complet d\'adhésion avec approbation, refus motivé et suivi du statut.'},
        bulkModeration: {title: 'Modération en lot', description: 'Approuvez ou refusez plusieurs demandes en un seul appel atomique, avec un audit ciblé.'},
        multiInvite: {title: 'Invitations multi-domaines', description: 'Invitez la même adresse e-mail sur plusieurs domaines en une seule action, avec contrôle par domaine.'},
        analytics: {title: 'Statistiques de modération', description: 'Compteurs, taux d\'acceptation, temps médian de décision et top modérateurs — calculés en temps réel.'},
        transferOwnership: {title: 'Transfert de propriété', description: 'Cédez la propriété d\'un domaine à un autre utilisateur via un lien signé, sans bascule prématurée.'},
        auditLog: {title: 'Journal d\'audit', description: 'Trace immuable de chaque décision et action de modération, consultable par domaine.'},
        notifications: {title: 'Notifications email', description: 'Owners et demandeurs informés à chaque étape, dans leur propre langue.'},
        multilingual: {title: 'Multilingue natif', description: 'Nom et description traduisibles dans 5 langues : FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traductions IA', description: 'Pré-remplissez les traductions en un clic grâce à l\'intégration DeepL.'},
        languageGate: {title: 'Langues autorisées', description: 'Restreignez les langues d\'édition propres à chaque domaine.'},
      },
    },
    subjects: {
      badge: 'Sujets',
      title: 'Catégorisez avec souplesse',
      intro: 'Des sujets pour organiser librement les thématiques de chaque domaine.',
      features: {
        crud: {title: 'Gestion complète', description: 'Création, édition et activation de sujets propres à chaque domaine.'},
        multilingual: {title: 'Contenus multilingues', description: 'Nom et description traduisibles en 5 langues.'},
        aiTranslate: {title: 'Traductions DeepL', description: 'Génération automatique des traductions, prête à relire.'},
        tagging: {title: 'Liaison aux questions', description: 'Tagging multi-sujets avec ordre personnalisable par sujet.'},
        autoCreate: {title: 'Auto-création à l\'import', description: 'Les sujets manquants se créent automatiquement lors de l\'import.'},
      },
    },
    questions: {
      badge: 'Questions',
      title: 'Une banque de questions sans compromis',
      intro: 'Du QCM enrichi de médias aux explications pédagogiques, chaque question s\'exprime dans toutes vos langues.',
      features: {
        multipleChoice: {title: 'Choix multiple flexible', description: 'Une seule réponse correcte ou plusieurs : vous décidez par question.'},
        multilingual: {title: 'Contenu multilingue', description: 'Titre, description, explication et options de réponse traduits en 5 langues.'},
        images: {title: 'Images intégrées', description: 'Upload avec déduplication automatique : illustrez sans gonfler le stockage.'},
        videos: {title: 'Vidéos hébergées', description: 'Upload de fichiers vidéo directement attachés à la question.'},
        youtube: {title: 'YouTube prêt à l\'emploi', description: 'Collez n\'importe quelle URL — watch, shorts, embed, youtu.be — elle est normalisée.'},
        modes: {title: 'Practice ou examen', description: 'Activez chaque question pour le mode entraînement, examen, ou les deux.'},
        explanations: {title: 'Explications détaillées', description: 'Texte riche affiché après la réponse en mode practice.'},
        aiTranslate: {title: 'Traductions en lot', description: 'DeepL traduit titre, description, explication et options en un seul appel.'},
        importExport: {title: 'Import / Export structurés', description: 'JSON versionné et CSV pour migrer ou archiver vos questions.'},
        duplicate: {title: 'Duplication', description: 'Clonez une question existante pour gagner du temps sur les variantes.'},
      },
    },
    quizzes: {
      badge: 'Quiz',
      title: 'Diffusez, chronométrez, suivez',
      intro: 'Practice, examen ou évaluation publique : chaque template combine vos règles de mode, durée et visibilité.',
      features: {
        modes: {title: 'Practice et Exam', description: 'Feedback immédiat ou tentative unique avec révélation contrôlée.'},
        timer: {title: 'Timer configurable', description: 'Durée par template, expiration automatique côté serveur.'},
        window: {title: 'Fenêtre de disponibilité', description: 'Plage de dates ou template permanent — au choix.'},
        visibility: {title: 'Visibilité fine', description: 'Score et détail des réponses : immédiat, programmé à une date, ou jamais — chaque dimension se règle indépendamment.'},
        notifyUnlock: {title: 'Notif au déverrouillage', description: 'Email automatique aux participants quand la fenêtre du résultat ou du détail s\'ouvre, avec lien direct vers leur session.'},
        shuffle: {title: 'Mélange par session', description: 'Activez le shuffle pour distribuer un ordre différent à chaque utilisateur, déterministe par session (même ordre à chaque rechargement).'},
        public: {title: 'Quiz publics', description: 'Permettez l\'accès sans appartenance au domaine pour les évaluations ouvertes.'},
        assignment: {title: 'Assignation en masse', description: 'Affectez un template à plusieurs utilisateurs en un appel atomique.'},
        emails: {title: 'Emails d\'assignation', description: 'Notification automatique avec deadline et lien direct, dans la langue du destinataire.'},
        messages: {title: 'Messages contextuels', description: 'Threads d\'alertes par question : ouvrez une conversation pendant le quiz.'},
        scoring: {title: 'Scoring pondéré', description: 'Poids par question dans un template, évaluation tout-ou-rien sur les options correctes.'},
        pdf: {title: 'Export PDF', description: 'Génération A4 du résultat avec score, détails par question et explications.'},
        tracking: {title: 'Suivi des sessions', description: 'Vue par template avec statut de complétion par utilisateur.'},
      },
    },
    learning: {
      badge: 'LMS',
      title: 'Cours, leçons et parcours d\'apprentissage',
      intro: 'Concevez des parcours complets : sections, leçons, blocs polymorphes et publication contrôlée — chaque cours reste dans les langues de votre domaine.',
      features: {
        catalog: {title: 'Catalogue cherchable', description: 'Vos apprenants parcourent les cours par mot-clé, niveau et domaine, avec une carte d\'aperçu par cours.'},
        structure: {title: 'Cours → Sections → Leçons', description: 'Une hiérarchie claire pour organiser vos parcours : les sections groupent les leçons, les leçons portent les blocs.'},
        blocks: {title: '8 types de blocs', description: 'Texte enrichi, image, vidéo, fichier, quiz, callout, code, iframe — chaque type a son éditeur dédié.'},
        editor: {title: 'Éditeur drag-and-drop', description: 'Réorganisez les blocs d\'une leçon par glisser-déposer. Chaque bloc s\'édite avec un bouton Enregistrer / Annuler explicite — aucun envoi silencieux. Même UX pour les sections et leçons d\'un cours.'},
        calloutVariants: {title: 'Variantes de callout', description: 'Les blocs encadrés portent une variante sémantique (info / succès / avertissement / erreur) qui colore la bordure gauche.'},
        translations: {title: 'Traductions par bloc', description: 'Onglets de langue dans chaque éditeur de bloc, avec un bouton « traduire depuis l\'onglet actif » qui remplit les champs vides via DeepL.'},
        viewAsLearner: {title: 'Vue apprenant', description: 'Bouton œil pour basculer en mode prévisualisation : voyez la leçon exactement comme un étudiant la verra, sans les contrôles d\'édition.'},
        publish: {title: 'Publier, dépublier, cloner', description: 'Workflow brouillon → publié, retour en brouillon possible, et clonage en un clic pour décliner une variante.'},
        safeHtml: {title: 'HTML assaini', description: 'Le texte enrichi passe par nh3 avec une allowlist stricte (CSS de Quill autorisé, scripts et URL exotiques nettoyés).'},
        multilingual: {title: 'Multilingue par domaine', description: 'Le cours et ses traductions sont contraints à `Domain.allowed_languages`. Aucune langue accidentelle ne passe.'},
      },
    },
    enrollment: {
      badge: 'Inscriptions',
      title: 'De l\'inscription au certificat',
      intro: 'Trois modes d\'inscription, progression suivie leçon par leçon, quiz de validation et certificats PDF auto-générés — le cycle complet de l\'apprenant.',
      features: {
        modes: {title: '3 modes d\'inscription', description: 'Ouvert (auto-enrôlement), sur demande (modéré par l\'instructeur), ou sur invitation uniquement.'},
        invites: {title: 'Invitations par email', description: 'Invitez des apprenants en masse avec deadline et rappel automatique avant l\'expiration.'},
        progress: {title: 'Suivi de progression', description: 'Chaque leçon marquée complète actualise la progression du cours en pourcentage, persistée par utilisateur.'},
        validationQuiz: {title: 'Quiz de validation', description: 'Attachez un quiz à une leçon : tant que le score minimum n\'est pas atteint, la leçon reste non validée.'},
        finalQuiz: {title: 'Quiz final + certificat', description: 'Le passage du quiz final déclenche l\'émission du certificat — seuil de réussite paramétrable par l\'instructeur.'},
        certificates: {title: 'Certificats PDF', description: 'Génération PDF asynchrone via Celery + reportlab, avec numérotation séquentielle par cours.'},
        verification: {title: 'Vérification publique', description: 'Chaque certificat a une URL publique de vérification — signée, anti-falsification, anon-throttled.'},
        emails: {title: '5 emails localisés', description: 'Inscription créée, approuvée, refusée, cours terminé, certificat émis — chacun traduit en FR/EN/NL/IT/ES via gettext.'},
        analytics: {title: 'Analytics par cours', description: 'Compteurs d\'inscrits, taux de complétion, progression médiane et tendance d\'inscriptions sur 30 jours.'},
        dashboard: {title: 'Tableau de bord apprenant', description: 'La page /dashboard agrège les cours en cours, les certificats, les quiz à passer et le catalogue à découvrir.'},
      },
    },
    platform: {
      badge: 'Plateforme',
      title: 'Une infrastructure prête pour la production',
      intro: 'Tout ce qui rend la plateforme fiable, multilingue et observable au quotidien.',
      features: {
        auth: {title: 'Auth JWT et confirmation email', description: 'Inscription, confirmation email et réinitialisation de mot de passe sécurisées.'},
        magicLink: {title: 'Connexion par magic link', description: 'Authentification sans mot de passe : un lien signé reçu par e-mail suffit pour se connecter.'},
        notificationPrefs: {title: 'Préférences de notifications', description: 'Chaque utilisateur choisit quels e-mails il reçoit, par catégorie (adhésions, invitations, transferts).'},
        multilingual: {title: 'UI multilingue', description: '5 langues couvertes côté interface : FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Envoi asynchrone fiable avec retry et backoff. SMTP ou Microsoft Graph.'},
        dashboard: {title: 'Tableau de bord', description: 'KPIs et graphiques Chart.js : utilisateurs actifs, domaines, questions, sessions.'},
        diagnostics: {title: 'Diagnostics système', description: 'Snapshot live de la config (DB, email, upload, DeepL) avec checks à la demande.'},
        rateLimit: {title: 'Rate limiting', description: 'Protection des endpoints publics et sensibles via ScopedRateThrottle.'},
        api: {title: 'API OpenAPI', description: 'Schéma drf-spectacular et client TypeScript généré automatiquement.'},
      },
    },
  },
};

const EN_CONTENT: FeaturesContent = {
  eyebrow: 'Platform',
  title: 'Everything you need to build quizzes that matter',
  intro: 'From organisational structure to detailed results, QuizOnline brings content authoring, delivery and follow-up into a single product designed multilingual from the ground up.',
  ctaPrimary: 'Create an account',
  ctaSecondary: 'Sign in',
  ctaLoggedIn: 'View my quizzes',
  sections: {
    domains: {
      badge: 'Domains',
      title: 'Organise your content by domain',
      intro: 'Give each entity its own space, roles and rules. Domains structure the entire platform.',
      features: {
        roles: {title: 'Role hierarchy', description: 'Owner, managers and members, each with permissions tuned to their level.'},
        policies: {title: 'Membership policies', description: 'Three approval modes: automatic, owner-only, or owner-and-managers.'},
        requests: {title: 'Self-service join requests', description: 'Full join workflow with approval, motivated rejection and status tracking.'},
        bulkModeration: {title: 'Bulk moderation', description: 'Approve or reject many requests in a single atomic call, with focused audit logging.'},
        multiInvite: {title: 'Multi-domain invitations', description: 'Invite the same email address to several domains in one action, with per-domain authorization checks.'},
        analytics: {title: 'Moderation analytics', description: 'Counters, acceptance rate, median decision time and top moderators — computed in real time.'},
        transferOwnership: {title: 'Ownership transfer', description: 'Hand a domain over to another user via a signed link, with no premature switchover.'},
        auditLog: {title: 'Audit log', description: 'Immutable trail of every moderation decision and action, browsable per domain.'},
        notifications: {title: 'Email notifications', description: 'Owners and applicants kept informed at every step, in their own language.'},
        multilingual: {title: 'Multilingual by design', description: 'Translatable name and description across five languages: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'AI translations', description: 'Pre-fill translations in one click thanks to the DeepL integration.'},
        languageGate: {title: 'Allowed languages', description: 'Restrict authoring languages on a per-domain basis.'},
      },
    },
    subjects: {
      badge: 'Topics',
      title: 'Categorise with flexibility',
      intro: 'Topics let you freely organise the themes that matter for each domain.',
      features: {
        crud: {title: 'Full management', description: 'Create, edit and toggle topics scoped to a single domain.'},
        multilingual: {title: 'Multilingual content', description: 'Translatable name and description in five languages.'},
        aiTranslate: {title: 'DeepL translations', description: 'Auto-generate translations ready for review.'},
        tagging: {title: 'Question linkage', description: 'Multi-topic tagging with custom ordering per topic.'},
        autoCreate: {title: 'Auto-created on import', description: 'Missing topics appear automatically during question import.'},
      },
    },
    questions: {
      badge: 'Questions',
      title: 'An uncompromised question bank',
      intro: 'From media-rich multiple-choice to teaching-grade explanations, every question speaks all your languages.',
      features: {
        multipleChoice: {title: 'Flexible multiple choice', description: 'Single correct answer or several — you choose, per question.'},
        multilingual: {title: 'Multilingual content', description: 'Title, description, explanation and answer options translated in five languages.'},
        images: {title: 'Embedded images', description: 'Upload with automatic deduplication; illustrate without inflating storage.'},
        videos: {title: 'Hosted video', description: 'Upload video files attached straight to the question.'},
        youtube: {title: 'YouTube ready', description: 'Paste any URL — watch, shorts, embed, youtu.be — it gets normalized for you.'},
        modes: {title: 'Practice or exam', description: 'Enable each question for practice, exam, or both pools.'},
        explanations: {title: 'Detailed explanations', description: 'Rich-text content shown after answering in practice mode.'},
        aiTranslate: {title: 'Batch translations', description: 'DeepL translates title, description, explanation and options in a single call.'},
        importExport: {title: 'Structured import / export', description: 'Versioned JSON and CSV to migrate or archive your question bank.'},
        duplicate: {title: 'Duplication', description: 'Clone an existing question to save time on variants.'},
      },
    },
    quizzes: {
      badge: 'Quizzes',
      title: 'Deliver, time, follow up',
      intro: 'Practice, exam or public assessment: every template combines your mode, duration and visibility rules.',
      features: {
        modes: {title: 'Practice and Exam', description: 'Immediate feedback or single attempt with controlled reveal.'},
        timer: {title: 'Configurable timer', description: 'Per-template duration with server-side automatic expiry.'},
        window: {title: 'Availability window', description: 'Date range, or permanent template — your choice.'},
        visibility: {title: 'Fine-grained visibility', description: 'Score and answer detail: immediate, scheduled, or never — each dimension is configurable independently.'},
        notifyUnlock: {title: 'Unlock notifications', description: 'Automatic email to participants when the result or detail visibility window opens, with a direct link to their session.'},
        shuffle: {title: 'Per-session shuffle', description: 'Toggle on to give every participant a different order, deterministic per session (same order on every reload).'},
        public: {title: 'Public quizzes', description: 'Allow access without domain membership for open assessments.'},
        assignment: {title: 'Bulk assignment', description: 'Assign a template to many users in a single atomic call.'},
        emails: {title: 'Assignment emails', description: 'Automatic notification with deadline and direct link, in the recipient\'s language.'},
        messages: {title: 'Contextual messaging', description: 'Per-question alert threads — start a conversation during the quiz.'},
        scoring: {title: 'Weighted scoring', description: 'Per-question weight in a template, all-or-nothing on correct options.'},
        pdf: {title: 'PDF export', description: 'A4 result generation with score, per-question detail and explanations.'},
        tracking: {title: 'Session tracking', description: 'Per-template view with completion status per user.'},
      },
    },
    learning: {
      badge: 'LMS',
      title: 'Courses, lessons and learning paths',
      intro: 'Design full learning paths: sections, lessons, polymorphic blocks and controlled publishing — every course stays within your domain\'s languages.',
      features: {
        catalog: {title: 'Searchable catalog', description: 'Your learners browse courses by keyword, level and domain, with a preview card for each.'},
        structure: {title: 'Course → Sections → Lessons', description: 'A clear hierarchy to organize paths: sections group lessons, lessons host the blocks.'},
        blocks: {title: '8 block types', description: 'Rich text, image, video, file, quiz, callout, code, iframe — each type has its dedicated editor.'},
        editor: {title: 'Drag-and-drop editor', description: 'Reorder blocks in a lesson by drag-and-drop. Each block edits with an explicit Save / Cancel footer — no silent autosave. Same UX for sections and lessons inside a course.'},
        calloutVariants: {title: 'Callout variants', description: 'Callout blocks carry a semantic variant (info / success / warning / error) that drives the left-border colour.'},
        translations: {title: 'Per-block translations', description: 'Language tabs in every block editor, with a "translate from the active tab" button that fills blanks via DeepL.'},
        viewAsLearner: {title: 'View as learner', description: 'Eye toggle to preview a lesson exactly the way a student sees it, with all editing controls hidden.'},
        publish: {title: 'Publish, unpublish, clone', description: 'Draft → published workflow, back to draft when needed, one-click clone to spin off a variant.'},
        safeHtml: {title: 'Sanitized HTML', description: 'Rich text runs through nh3 with a strict allowlist (Quill CSS allowed, scripts and exotic URLs scrubbed).'},
        multilingual: {title: 'Per-domain multilingual', description: 'Course and translations are constrained to Domain.allowed_languages. No accidental language slips through.'},
      },
    },
    enrollment: {
      badge: 'Enrollment',
      title: 'From sign-up to certificate',
      intro: 'Three enrollment modes, lesson-by-lesson progress, validation quizzes and auto-issued PDF certificates — the full learner cycle.',
      features: {
        modes: {title: '3 enrollment modes', description: 'Open (auto-enroll), request (instructor-moderated), or invitation-only.'},
        invites: {title: 'Email invitations', description: 'Invite learners in bulk with a deadline and automatic reminder before expiry.'},
        progress: {title: 'Progress tracking', description: 'Each completed lesson updates the course completion percentage, persisted per user.'},
        validationQuiz: {title: 'Validation quiz', description: 'Attach a quiz to a lesson: until the passing score is reached, the lesson stays unvalidated.'},
        finalQuiz: {title: 'Final quiz + certificate', description: 'Passing the final quiz triggers certificate issuance — passing threshold tunable by the instructor.'},
        certificates: {title: 'PDF certificates', description: 'Async PDF rendering via Celery + reportlab, with per-course sequential numbering.'},
        verification: {title: 'Public verification', description: 'Every certificate has a public verification URL — signed, anti-tamper, anon-throttled.'},
        emails: {title: '5 localized emails', description: 'Enrollment created, approved, rejected, course completed, certificate issued — each translated to FR/EN/NL/IT/ES via gettext.'},
        analytics: {title: 'Per-course analytics', description: 'Enrollment counts, completion rate, median progress and a 30-day enrollment trend chart.'},
        dashboard: {title: 'Learner dashboard', description: 'The /dashboard page aggregates in-progress courses, certificates, pending quizzes and the catalog.'},
      },
    },
    platform: {
      badge: 'Platform',
      title: 'Production-ready infrastructure',
      intro: 'Everything that makes the platform reliable, multilingual and observable, day in and day out.',
      features: {
        auth: {title: 'JWT auth and email confirm', description: 'Secure registration, email confirmation and password reset flows.'},
        magicLink: {title: 'Magic-link login', description: 'Passwordless authentication: a signed link received by email is enough to sign in.'},
        notificationPrefs: {title: 'Notification preferences', description: 'Each user picks which emails they receive, by category (join requests, invitations, transfers).'},
        multilingual: {title: 'Multilingual UI', description: 'Five languages on the interface: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Reliable async delivery with retry and backoff. SMTP or Microsoft Graph.'},
        dashboard: {title: 'Admin dashboard', description: 'Chart.js KPIs: active users, domains, questions and sessions.'},
        diagnostics: {title: 'System diagnostics', description: 'Live snapshot of DB, email, upload and DeepL config with on-demand checks.'},
        rateLimit: {title: 'Rate limiting', description: 'Public and sensitive endpoints protected via ScopedRateThrottle.'},
        api: {title: 'OpenAPI client', description: 'drf-spectacular schema with auto-generated TypeScript client.'},
      },
    },
  },
};

const NL_CONTENT: FeaturesContent = {
  eyebrow: 'Platform',
  title: 'Alles om quizzen te bouwen die ertoe doen',
  intro: 'Van organisatorische structuur tot gedetailleerde resultaten: QuizOnline brengt contentcreatie, distributie en opvolging samen in één meertalig platform.',
  ctaPrimary: 'Account maken',
  ctaSecondary: 'Aanmelden',
  ctaLoggedIn: 'Mijn quizzen bekijken',
  sections: {
    domains: {
      badge: 'Domeinen',
      title: 'Organiseer uw content per domein',
      intro: 'Geef elke entiteit haar eigen ruimte, rollen en regels. Domeinen structureren het hele platform.',
      features: {
        roles: {title: 'Rolhiërarchie', description: 'Eigenaar, beheerders en leden met rechten afgestemd op elk niveau.'},
        policies: {title: 'Toetredingsbeleid', description: 'Drie modi: automatisch, alleen eigenaar, of eigenaar en beheerders.'},
        requests: {title: 'Zelfbedieningsverzoeken', description: 'Volledig toetredingsproces met goedkeuring, gemotiveerde afwijzing en statusopvolging.'},
        bulkModeration: {title: 'Bulkmoderatie', description: 'Keur meerdere aanvragen tegelijk goed of af in één atomaire oproep, met gerichte audit-logging.'},
        multiInvite: {title: 'Uitnodigingen voor meerdere domeinen', description: 'Nodig hetzelfde e-mailadres uit voor verschillende domeinen in één actie, met rechtencontrole per domein.'},
        analytics: {title: 'Moderatiestatistieken', description: 'Tellers, acceptatiepercentage, mediane beslissingstijd en topmoderators — in realtime berekend.'},
        transferOwnership: {title: 'Eigenaarschap overdragen', description: 'Draag een domein over aan een andere gebruiker via een ondertekende link, zonder voortijdige wissel.'},
        auditLog: {title: 'Auditlogboek', description: 'Onveranderlijk spoor van elke moderatiebeslissing en -actie, per domein doorbladerbaar.'},
        notifications: {title: 'E-mailmeldingen', description: 'Eigenaars en aanvragers worden geïnformeerd bij elke stap, in hun eigen taal.'},
        multilingual: {title: 'Meertalig vanaf de start', description: 'Naam en beschrijving vertaalbaar in vijf talen: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'AI-vertalingen', description: 'Vul vertalingen vooraf in met één klik dankzij de DeepL-integratie.'},
        languageGate: {title: 'Toegestane talen', description: 'Beperk de toegestane bewerkingstalen per domein.'},
      },
    },
    subjects: {
      badge: 'Onderwerpen',
      title: 'Categoriseer met flexibiliteit',
      intro: 'Onderwerpen om de thema\'s van elk domein vrij te organiseren.',
      features: {
        crud: {title: 'Volledig beheer', description: 'Onderwerpen aanmaken, bewerken en activeren binnen elk domein.'},
        multilingual: {title: 'Meertalige content', description: 'Naam en beschrijving vertaalbaar in vijf talen.'},
        aiTranslate: {title: 'DeepL-vertalingen', description: 'Automatisch gegenereerde vertalingen, klaar voor revisie.'},
        tagging: {title: 'Koppeling met vragen', description: 'Multi-onderwerp tagging met aangepaste sortering per onderwerp.'},
        autoCreate: {title: 'Auto-aanmaak bij import', description: 'Ontbrekende onderwerpen verschijnen automatisch tijdens vraag-import.'},
      },
    },
    questions: {
      badge: 'Vragen',
      title: 'Een vragenbank zonder compromissen',
      intro: 'Van mediarijke meerkeuzevragen tot pedagogische uitleg: elke vraag spreekt al uw talen.',
      features: {
        multipleChoice: {title: 'Flexibele meerkeuze', description: 'Één correct antwoord of meerdere — u beslist per vraag.'},
        multilingual: {title: 'Meertalige inhoud', description: 'Titel, beschrijving, uitleg en antwoordopties vertaald in vijf talen.'},
        images: {title: 'Ingebouwde afbeeldingen', description: 'Upload met automatische deduplicatie; illustreer zonder opslag op te blazen.'},
        videos: {title: 'Gehoste video', description: 'Upload videobestanden direct gekoppeld aan de vraag.'},
        youtube: {title: 'YouTube-klaar', description: 'Plak elke URL — watch, shorts, embed, youtu.be — wij normaliseren ze voor u.'},
        modes: {title: 'Practice of examen', description: 'Schakel elke vraag in voor practice, examen of beide pools.'},
        explanations: {title: 'Gedetailleerde uitleg', description: 'Rich-text inhoud die na het antwoorden in practice-modus wordt getoond.'},
        aiTranslate: {title: 'Batch-vertalingen', description: 'DeepL vertaalt titel, beschrijving, uitleg en opties in één oproep.'},
        importExport: {title: 'Gestructureerde import/export', description: 'Versioned JSON en CSV om uw vragenbank te migreren of archiveren.'},
        duplicate: {title: 'Duplicatie', description: 'Kloon een bestaande vraag om tijd te besparen op varianten.'},
      },
    },
    quizzes: {
      badge: 'Quizzen',
      title: 'Verdeel, klok, volg op',
      intro: 'Practice, examen of openbare evaluatie: elke template combineert uw modus-, duur- en zichtbaarheidsregels.',
      features: {
        modes: {title: 'Practice en Exam', description: 'Onmiddellijke feedback of één poging met gecontroleerde onthulling.'},
        timer: {title: 'Configureerbare timer', description: 'Duur per template met automatische server-side vervaldatum.'},
        window: {title: 'Beschikbaarheidsvenster', description: 'Datumbereik of permanent template — uw keuze.'},
        visibility: {title: 'Fijnmazige zichtbaarheid', description: 'Score en antwoorddetails: onmiddellijk, gepland, of nooit — elk afzonderlijk in te stellen.'},
        notifyUnlock: {title: 'Melding bij ontgrendeling', description: 'Automatische e-mail aan deelnemers wanneer het zichtbaarheidsvenster van resultaat of details opent, met een directe link.'},
        shuffle: {title: 'Schudden per sessie', description: 'Activeer shuffle om elke deelnemer een andere volgorde te geven, deterministisch per sessie (dezelfde volgorde bij elke herlading).'},
        public: {title: 'Openbare quizzen', description: 'Sta toegang toe zonder domeinlidmaatschap voor open evaluaties.'},
        assignment: {title: 'Bulk-toewijzing', description: 'Wijs een template toe aan meerdere gebruikers in één atomaire oproep.'},
        emails: {title: 'Toewijzingsmails', description: 'Automatische melding met deadline en directe link, in de taal van de ontvanger.'},
        messages: {title: 'Contextuele berichten', description: 'Alert-threads per vraag — start een gesprek tijdens de quiz.'},
        scoring: {title: 'Gewogen scoring', description: 'Gewicht per vraag in een template, alles-of-niets op correcte opties.'},
        pdf: {title: 'PDF-export', description: 'A4-resultaat met score, vraagdetails en uitleg.'},
        tracking: {title: 'Sessie-opvolging', description: 'Per template overzicht met voltooiingsstatus per gebruiker.'},
      },
    },
    learning: {
      badge: 'LMS',
      title: 'Cursussen, lessen en leertrajecten',
      intro: 'Ontwerp volledige leertrajecten: secties, lessen, polymorfe blokken en gecontroleerde publicatie — elke cursus blijft binnen de talen van uw domein.',
      features: {
        catalog: {title: 'Doorzoekbare catalogus', description: 'Uw lerenden bladeren door cursussen op trefwoord, niveau en domein, met een voorbeeldkaart per cursus.'},
        structure: {title: 'Cursus → Secties → Lessen', description: 'Een duidelijke hiërarchie om leertrajecten te organiseren: secties bundelen lessen, lessen dragen de blokken.'},
        blocks: {title: '8 bloktypes', description: 'Rich text, afbeelding, video, bestand, quiz, callout, code, iframe — elk type heeft zijn eigen editor.'},
        editor: {title: 'Drag-and-drop editor', description: 'Herorden blokken in een les via drag-and-drop. Elk blok bewerk je met een expliciete Opslaan / Annuleren knop — geen stille autosave. Zelfde UX voor secties en lessen binnen een cursus.'},
        calloutVariants: {title: 'Callout-varianten', description: 'Callout-blokken dragen een semantische variant (info / succes / waarschuwing / fout) die de linker randkleur bepaalt.'},
        translations: {title: 'Vertalingen per blok', description: 'Taaltabbladen in elke blokeditor, met een "vertaal vanuit het actieve tabblad"-knop die lege velden via DeepL invult.'},
        viewAsLearner: {title: 'Voorbeeld als lerende', description: 'Oog-knop om een les te previewen zoals een student hem ziet, zonder bewerkingsknoppen.'},
        publish: {title: 'Publiceren, depubliceren, klonen', description: 'Concept → gepubliceerd workflow, terug naar concept wanneer nodig, één-klik klonen voor een variant.'},
        safeHtml: {title: 'Geschoonde HTML', description: 'Rich text loopt door nh3 met een strikte whitelist (Quill-CSS toegestaan, scripts en exotische URL\'s verwijderd).'},
        multilingual: {title: 'Meertalig per domein', description: 'Cursus en vertalingen zijn beperkt tot Domain.allowed_languages. Geen onbedoelde talen.'},
      },
    },
    enrollment: {
      badge: 'Inschrijvingen',
      title: 'Van aanmelding tot certificaat',
      intro: 'Drie inschrijvingsmodi, voortgang per les bijgehouden, validatie-quizzen en automatisch gegenereerde PDF-certificaten — de volledige cyclus van de lerende.',
      features: {
        modes: {title: '3 inschrijvingsmodi', description: 'Open (auto-inschrijving), op aanvraag (door instructeur gemodereerd), of alleen op uitnodiging.'},
        invites: {title: 'E-mailuitnodigingen', description: 'Nodig lerenden uit in bulk met een deadline en automatische herinnering vóór verloop.'},
        progress: {title: 'Voortgangsregistratie', description: 'Elke voltooide les werkt het voltooiingspercentage van de cursus bij, bewaard per gebruiker.'},
        validationQuiz: {title: 'Validatie-quiz', description: 'Koppel een quiz aan een les: tot de minimumscore is behaald, blijft de les niet gevalideerd.'},
        finalQuiz: {title: 'Eindquiz + certificaat', description: 'Slagen voor de eindquiz activeert de uitgifte van het certificaat — slagingsdrempel instelbaar door de instructeur.'},
        certificates: {title: 'PDF-certificaten', description: 'Asynchrone PDF-rendering via Celery + reportlab, met sequentiële nummering per cursus.'},
        verification: {title: 'Publieke verificatie', description: 'Elk certificaat heeft een publieke verificatie-URL — ondertekend, anti-manipulatie, anon-throttled.'},
        emails: {title: '5 gelokaliseerde e-mails', description: 'Inschrijving aangemaakt, goedgekeurd, geweigerd, cursus voltooid, certificaat uitgegeven — elk vertaald naar FR/EN/NL/IT/ES via gettext.'},
        analytics: {title: 'Analytics per cursus', description: 'Aantal inschrijvingen, voltooiingspercentage, mediane voortgang en een trendgrafiek van 30 dagen inschrijvingen.'},
        dashboard: {title: 'Dashboard voor lerenden', description: 'De /dashboard-pagina bundelt lopende cursussen, certificaten, openstaande quizzen en de catalogus.'},
      },
    },
    platform: {
      badge: 'Platform',
      title: 'Productieklare infrastructuur',
      intro: 'Alles wat het platform betrouwbaar, meertalig en observeerbaar maakt, elke dag opnieuw.',
      features: {
        auth: {title: 'JWT-auth en e-mailbevestiging', description: 'Veilige registratie, e-mailbevestiging en wachtwoordreset.'},
        magicLink: {title: 'Magic-link login', description: 'Wachtwoordloze authenticatie: een ondertekende link per e-mail volstaat om in te loggen.'},
        notificationPrefs: {title: 'Meldingsvoorkeuren', description: 'Elke gebruiker kiest welke e-mails hij ontvangt, per categorie (aanvragen, uitnodigingen, overdrachten).'},
        multilingual: {title: 'Meertalige UI', description: 'Vijf talen aan de interface: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Betrouwbare async-levering met retry en backoff. SMTP of Microsoft Graph.'},
        dashboard: {title: 'Admin-dashboard', description: 'Chart.js KPIs: actieve gebruikers, domeinen, vragen en sessies.'},
        diagnostics: {title: 'Systeemdiagnose', description: 'Live snapshot van DB, e-mail, upload en DeepL-config met on-demand checks.'},
        rateLimit: {title: 'Rate limiting', description: 'Openbare en gevoelige endpoints beschermd via ScopedRateThrottle.'},
        api: {title: 'OpenAPI-client', description: 'drf-spectacular schema met automatisch gegenereerde TypeScript-client.'},
      },
    },
  },
};

const IT_CONTENT: FeaturesContent = {
  eyebrow: 'Piattaforma',
  title: 'Tutto per creare quiz che contano',
  intro: 'Dalla struttura organizzativa ai risultati dettagliati, QuizOnline unisce creazione di contenuti, distribuzione e monitoraggio in un\'unica piattaforma multilingue.',
  ctaPrimary: 'Crea un account',
  ctaSecondary: 'Accedi',
  ctaLoggedIn: 'Vedi i miei quiz',
  sections: {
    domains: {
      badge: 'Domini',
      title: 'Organizza i contenuti per dominio',
      intro: 'Dai a ogni entità il suo spazio, ruoli e regole. I domini strutturano l\'intera piattaforma.',
      features: {
        roles: {title: 'Gerarchia di ruoli', description: 'Proprietario, gestori e membri con permessi calibrati su ogni livello.'},
        policies: {title: 'Politiche di adesione', description: 'Tre modalità di approvazione: automatica, solo proprietario, o proprietario e gestori.'},
        requests: {title: 'Richieste self-service', description: 'Workflow completo di adesione con approvazione, rifiuto motivato e tracciamento dello stato.'},
        bulkModeration: {title: 'Moderazione in blocco', description: 'Approva o rifiuta più richieste in una singola chiamata atomica, con audit mirato.'},
        multiInvite: {title: 'Inviti multi-dominio', description: 'Invita lo stesso indirizzo e-mail su più domini in una sola azione, con controllo dei permessi per dominio.'},
        analytics: {title: 'Statistiche di moderazione', description: 'Contatori, tasso di accettazione, tempo mediano di decisione e migliori moderatori — calcolati in tempo reale.'},
        transferOwnership: {title: 'Trasferimento di proprietà', description: 'Cedi la proprietà di un dominio a un altro utente tramite un link firmato, senza scambio prematuro.'},
        auditLog: {title: 'Registro di audit', description: 'Traccia immutabile di ogni decisione e azione di moderazione, consultabile per dominio.'},
        notifications: {title: 'Notifiche email', description: 'Proprietari e richiedenti informati a ogni passaggio, nella propria lingua.'},
        multilingual: {title: 'Multilingue nativo', description: 'Nome e descrizione traducibili in cinque lingue: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traduzioni AI', description: 'Precompila le traduzioni con un clic grazie all\'integrazione DeepL.'},
        languageGate: {title: 'Lingue consentite', description: 'Limita le lingue di redazione per ogni singolo dominio.'},
      },
    },
    subjects: {
      badge: 'Argomenti',
      title: 'Categorizza con flessibilità',
      intro: 'Gli argomenti permettono di organizzare liberamente le tematiche di ogni dominio.',
      features: {
        crud: {title: 'Gestione completa', description: 'Crea, modifica e attiva argomenti specifici per ogni dominio.'},
        multilingual: {title: 'Contenuti multilingue', description: 'Nome e descrizione traducibili in cinque lingue.'},
        aiTranslate: {title: 'Traduzioni DeepL', description: 'Generazione automatica delle traduzioni, pronta per la revisione.'},
        tagging: {title: 'Collegamento alle domande', description: 'Tagging multi-argomento con ordinamento personalizzabile per argomento.'},
        autoCreate: {title: 'Auto-creazione all\'import', description: 'Gli argomenti mancanti vengono creati automaticamente durante l\'import.'},
      },
    },
    questions: {
      badge: 'Domande',
      title: 'Una banca dati senza compromessi',
      intro: 'Dalle domande a scelta multipla ricche di media alle spiegazioni didattiche, ogni domanda parla tutte le tue lingue.',
      features: {
        multipleChoice: {title: 'Scelta multipla flessibile', description: 'Una sola risposta corretta o più: decidi tu, per ogni domanda.'},
        multilingual: {title: 'Contenuto multilingue', description: 'Titolo, descrizione, spiegazione e opzioni di risposta tradotti in cinque lingue.'},
        images: {title: 'Immagini integrate', description: 'Upload con deduplicazione automatica: illustra senza gonfiare lo storage.'},
        videos: {title: 'Video ospitati', description: 'Upload di file video direttamente collegati alla domanda.'},
        youtube: {title: 'YouTube pronto all\'uso', description: 'Incolla qualsiasi URL — watch, shorts, embed, youtu.be — viene normalizzato.'},
        modes: {title: 'Practice o esame', description: 'Attiva ogni domanda per practice, esame, o entrambi i pool.'},
        explanations: {title: 'Spiegazioni dettagliate', description: 'Testo ricco mostrato dopo la risposta in modalità practice.'},
        aiTranslate: {title: 'Traduzioni in batch', description: 'DeepL traduce titolo, descrizione, spiegazione e opzioni in un\'unica chiamata.'},
        importExport: {title: 'Import / Export strutturati', description: 'JSON versionato e CSV per migrare o archiviare la banca dati.'},
        duplicate: {title: 'Duplicazione', description: 'Clona una domanda esistente per risparmiare tempo sulle varianti.'},
      },
    },
    quizzes: {
      badge: 'Quiz',
      title: 'Distribuisci, cronometra, monitora',
      intro: 'Practice, esame o valutazione pubblica: ogni template combina le tue regole di modalità, durata e visibilità.',
      features: {
        modes: {title: 'Practice ed Exam', description: 'Feedback immediato o tentativo unico con rivelazione controllata.'},
        timer: {title: 'Timer configurabile', description: 'Durata per template con scadenza automatica lato server.'},
        window: {title: 'Finestra di disponibilità', description: 'Intervallo di date o template permanente — a tua scelta.'},
        visibility: {title: 'Visibilità granulare', description: 'Punteggio e dettaglio risposte: immediato, programmato, o mai — ciascuna impostabile in modo indipendente.'},
        notifyUnlock: {title: 'Notifica allo sblocco', description: 'Email automatica ai partecipanti quando la finestra di visibilità del risultato o del dettaglio si apre, con link diretto.'},
        shuffle: {title: 'Mescolamento per sessione', description: 'Attiva lo shuffle per dare a ogni partecipante un ordine diverso, deterministico per sessione (stesso ordine ad ogni ricarica).'},
        public: {title: 'Quiz pubblici', description: 'Permetti l\'accesso senza appartenenza al dominio per valutazioni aperte.'},
        assignment: {title: 'Assegnazione in massa', description: 'Assegna un template a più utenti in una singola chiamata atomica.'},
        emails: {title: 'Email di assegnazione', description: 'Notifica automatica con scadenza e link diretto, nella lingua del destinatario.'},
        messages: {title: 'Messaggistica contestuale', description: 'Thread di alert per domanda: avvia una conversazione durante il quiz.'},
        scoring: {title: 'Punteggio ponderato', description: 'Peso per domanda nel template, valutazione tutto-o-niente sulle opzioni corrette.'},
        pdf: {title: 'Export PDF', description: 'Generazione A4 del risultato con punteggio, dettagli per domanda e spiegazioni.'},
        tracking: {title: 'Monitoraggio sessioni', description: 'Vista per template con stato di completamento per utente.'},
      },
    },
    learning: {
      badge: 'LMS',
      title: 'Corsi, lezioni e percorsi formativi',
      intro: 'Progetta percorsi completi: sezioni, lezioni, blocchi polimorfici e pubblicazione controllata — ogni corso resta nelle lingue del tuo dominio.',
      features: {
        catalog: {title: 'Catalogo ricercabile', description: 'I tuoi apprendenti sfogliano i corsi per parola chiave, livello e dominio, con una scheda di anteprima per ogni corso.'},
        structure: {title: 'Corso → Sezioni → Lezioni', description: 'Una gerarchia chiara per organizzare i percorsi: le sezioni raggruppano le lezioni, le lezioni ospitano i blocchi.'},
        blocks: {title: '8 tipi di blocchi', description: 'Testo ricco, immagine, video, file, quiz, callout, codice, iframe — ogni tipo ha il proprio editor dedicato.'},
        editor: {title: 'Editor drag-and-drop', description: 'Riordina i blocchi di una lezione tramite drag-and-drop. Ogni blocco si modifica con un pulsante Salva / Annulla esplicito — nessun salvataggio silenzioso. Stessa UX per sezioni e lezioni di un corso.'},
        calloutVariants: {title: 'Varianti dei callout', description: 'I blocchi callout portano una variante semantica (info / successo / avvertimento / errore) che colora il bordo sinistro.'},
        translations: {title: 'Traduzioni per blocco', description: 'Schede di lingua in ogni editor di blocco, con un pulsante "traduci dalla scheda attiva" che riempie i campi vuoti tramite DeepL.'},
        viewAsLearner: {title: 'Anteprima come studente', description: 'Pulsante occhio per visualizzare una lezione esattamente come la vede uno studente, senza i comandi di modifica.'},
        publish: {title: 'Pubblica, depubblica, clona', description: 'Workflow bozza → pubblicato, ritorno in bozza quando serve, clonazione in un clic per declinare una variante.'},
        safeHtml: {title: 'HTML sanificato', description: 'Il testo ricco passa per nh3 con una allowlist stretta (CSS di Quill consentito, script e URL esotici eliminati).'},
        multilingual: {title: 'Multilingue per dominio', description: 'Corso e traduzioni sono vincolati a Domain.allowed_languages. Nessuna lingua accidentale.'},
      },
    },
    enrollment: {
      badge: 'Iscrizioni',
      title: 'Dall\'iscrizione al certificato',
      intro: 'Tre modalità di iscrizione, progressione tracciata lezione per lezione, quiz di validazione e certificati PDF generati automaticamente — il ciclo completo dell\'apprendente.',
      features: {
        modes: {title: '3 modalità d\'iscrizione', description: 'Aperta (auto-iscrizione), su richiesta (moderata dall\'istruttore), o solo su invito.'},
        invites: {title: 'Inviti via email', description: 'Invita apprendenti in massa con una scadenza e promemoria automatico prima della scadenza.'},
        progress: {title: 'Tracciamento progressione', description: 'Ogni lezione completata aggiorna la percentuale di completamento del corso, persistita per utente.'},
        validationQuiz: {title: 'Quiz di validazione', description: 'Allega un quiz a una lezione: finché il punteggio minimo non è raggiunto, la lezione resta non convalidata.'},
        finalQuiz: {title: 'Quiz finale + certificato', description: 'Il superamento del quiz finale attiva l\'emissione del certificato — soglia di superamento configurabile dall\'istruttore.'},
        certificates: {title: 'Certificati PDF', description: 'Generazione PDF asincrona tramite Celery + reportlab, con numerazione sequenziale per corso.'},
        verification: {title: 'Verifica pubblica', description: 'Ogni certificato ha un URL pubblico di verifica — firmato, anti-manomissione, anon-throttled.'},
        emails: {title: '5 email localizzate', description: 'Iscrizione creata, approvata, rifiutata, corso completato, certificato emesso — ognuna tradotta in FR/EN/NL/IT/ES tramite gettext.'},
        analytics: {title: 'Analytics per corso', description: 'Conteggio iscrizioni, tasso di completamento, progressione mediana e grafico di tendenza delle iscrizioni a 30 giorni.'},
        dashboard: {title: 'Dashboard apprendente', description: 'La pagina /dashboard riunisce corsi in corso, certificati, quiz da svolgere e catalogo da scoprire.'},
      },
    },
    platform: {
      badge: 'Piattaforma',
      title: 'Un\'infrastruttura pronta per la produzione',
      intro: 'Tutto ciò che rende la piattaforma affidabile, multilingue e osservabile ogni giorno.',
      features: {
        auth: {title: 'Auth JWT e conferma email', description: 'Registrazione, conferma email e reset password sicuri.'},
        magicLink: {title: 'Login con magic link', description: 'Autenticazione senza password: basta un link firmato ricevuto via e-mail per accedere.'},
        notificationPrefs: {title: 'Preferenze di notifica', description: 'Ogni utente sceglie quali e-mail riceve, per categoria (richieste, inviti, trasferimenti).'},
        multilingual: {title: 'UI multilingue', description: 'Cinque lingue sull\'interfaccia: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Consegna asincrona affidabile con retry e backoff. SMTP o Microsoft Graph.'},
        dashboard: {title: 'Dashboard admin', description: 'KPI Chart.js: utenti attivi, domini, domande e sessioni.'},
        diagnostics: {title: 'Diagnostica di sistema', description: 'Snapshot live di DB, email, upload e DeepL con check on-demand.'},
        rateLimit: {title: 'Rate limiting', description: 'Endpoint pubblici e sensibili protetti tramite ScopedRateThrottle.'},
        api: {title: 'Client OpenAPI', description: 'Schema drf-spectacular con client TypeScript generato automaticamente.'},
      },
    },
  },
};

const ES_CONTENT: FeaturesContent = {
  eyebrow: 'Plataforma',
  title: 'Todo para diseñar cuestionarios que importan',
  intro: 'De la estructura organizativa a los resultados detallados, QuizOnline reúne la creación de contenido, la distribución y el seguimiento en un solo producto pensado multilingüe.',
  ctaPrimary: 'Crear una cuenta',
  ctaSecondary: 'Iniciar sesión',
  ctaLoggedIn: 'Ver mis cuestionarios',
  sections: {
    domains: {
      badge: 'Dominios',
      title: 'Organiza tu contenido por dominio',
      intro: 'Da a cada entidad su propio espacio, roles y reglas. Los dominios estructuran toda la plataforma.',
      features: {
        roles: {title: 'Jerarquía de roles', description: 'Propietario, gestores y miembros con permisos ajustados a cada nivel.'},
        policies: {title: 'Políticas de adhesión', description: 'Tres modos de aprobación: automático, solo propietario, o propietario y gestores.'},
        requests: {title: 'Solicitudes en autoservicio', description: 'Flujo completo con aprobación, rechazo motivado y seguimiento de estado.'},
        bulkModeration: {title: 'Moderación masiva', description: 'Aprueba o rechaza varias solicitudes en una sola llamada atómica, con auditoría puntual.'},
        multiInvite: {title: 'Invitaciones multidominio', description: 'Invita la misma dirección de correo a varios dominios en una sola acción, con control de permisos por dominio.'},
        analytics: {title: 'Estadísticas de moderación', description: 'Contadores, tasa de aceptación, tiempo mediano de decisión y top moderadores — calculados en tiempo real.'},
        transferOwnership: {title: 'Transferencia de propiedad', description: 'Cede la propiedad de un dominio a otro usuario mediante un enlace firmado, sin cambio prematuro.'},
        auditLog: {title: 'Registro de auditoría', description: 'Rastro inmutable de cada decisión y acción de moderación, consultable por dominio.'},
        notifications: {title: 'Notificaciones por email', description: 'Propietarios y solicitantes informados en cada paso, en su propio idioma.'},
        multilingual: {title: 'Multilingüe de origen', description: 'Nombre y descripción traducibles en cinco idiomas: FR, EN, NL, IT, ES.'},
        aiTranslate: {title: 'Traducciones IA', description: 'Pre-rellena las traducciones con un clic gracias a la integración DeepL.'},
        languageGate: {title: 'Idiomas permitidos', description: 'Restringe los idiomas de edición por dominio.'},
      },
    },
    subjects: {
      badge: 'Temas',
      title: 'Categoriza con flexibilidad',
      intro: 'Los temas permiten organizar libremente las temáticas de cada dominio.',
      features: {
        crud: {title: 'Gestión completa', description: 'Crea, edita y activa temas específicos de cada dominio.'},
        multilingual: {title: 'Contenido multilingüe', description: 'Nombre y descripción traducibles en cinco idiomas.'},
        aiTranslate: {title: 'Traducciones DeepL', description: 'Generación automática de traducciones, lista para revisar.'},
        tagging: {title: 'Vinculación con preguntas', description: 'Etiquetado multi-tema con orden personalizable por tema.'},
        autoCreate: {title: 'Auto-creación al importar', description: 'Los temas faltantes se crean automáticamente al importar preguntas.'},
      },
    },
    questions: {
      badge: 'Preguntas',
      title: 'Un banco de preguntas sin compromisos',
      intro: 'De la opción múltiple enriquecida con medios a las explicaciones pedagógicas, cada pregunta habla todos tus idiomas.',
      features: {
        multipleChoice: {title: 'Opción múltiple flexible', description: 'Una sola respuesta correcta o varias: tú decides, por pregunta.'},
        multilingual: {title: 'Contenido multilingüe', description: 'Título, descripción, explicación y opciones traducidos en cinco idiomas.'},
        images: {title: 'Imágenes integradas', description: 'Subida con deduplicación automática: ilustra sin inflar el almacenamiento.'},
        videos: {title: 'Vídeos alojados', description: 'Sube archivos de vídeo directamente vinculados a la pregunta.'},
        youtube: {title: 'YouTube listo', description: 'Pega cualquier URL — watch, shorts, embed, youtu.be — la normalizamos.'},
        modes: {title: 'Practice o examen', description: 'Activa cada pregunta para practice, examen, o ambos pools.'},
        explanations: {title: 'Explicaciones detalladas', description: 'Texto enriquecido mostrado tras la respuesta en modo practice.'},
        aiTranslate: {title: 'Traducciones por lotes', description: 'DeepL traduce título, descripción, explicación y opciones en una sola llamada.'},
        importExport: {title: 'Import / Export estructurados', description: 'JSON versionado y CSV para migrar o archivar tu banco.'},
        duplicate: {title: 'Duplicación', description: 'Clona una pregunta existente para ahorrar tiempo en variantes.'},
      },
    },
    quizzes: {
      badge: 'Cuestionarios',
      title: 'Distribuye, cronometra, sigue',
      intro: 'Practice, examen o evaluación pública: cada plantilla combina tus reglas de modo, duración y visibilidad.',
      features: {
        modes: {title: 'Practice y Exam', description: 'Feedback inmediato o intento único con revelación controlada.'},
        timer: {title: 'Temporizador configurable', description: 'Duración por plantilla con expiración automática del lado servidor.'},
        window: {title: 'Ventana de disponibilidad', description: 'Rango de fechas o plantilla permanente — a tu elección.'},
        visibility: {title: 'Visibilidad granular', description: 'Puntuación y detalle de respuestas: inmediato, programado, o nunca — cada dimensión configurable de forma independiente.'},
        notifyUnlock: {title: 'Aviso al desbloqueo', description: 'Email automático a los participantes cuando se abre la ventana de visibilidad del resultado o del detalle, con enlace directo.'},
        shuffle: {title: 'Mezclado por sesión', description: 'Activa el shuffle para dar a cada participante un orden diferente, determinista por sesión (mismo orden en cada recarga).'},
        public: {title: 'Cuestionarios públicos', description: 'Permite el acceso sin pertenencia al dominio para evaluaciones abiertas.'},
        assignment: {title: 'Asignación masiva', description: 'Asigna una plantilla a varios usuarios en una sola llamada atómica.'},
        emails: {title: 'Emails de asignación', description: 'Notificación automática con plazo y enlace directo, en el idioma del destinatario.'},
        messages: {title: 'Mensajería contextual', description: 'Hilos de alerta por pregunta: inicia una conversación durante el cuestionario.'},
        scoring: {title: 'Puntuación ponderada', description: 'Peso por pregunta en la plantilla, evaluación todo-o-nada en opciones correctas.'},
        pdf: {title: 'Export PDF', description: 'Generación A4 del resultado con puntuación, detalles por pregunta y explicaciones.'},
        tracking: {title: 'Seguimiento de sesiones', description: 'Vista por plantilla con estado de finalización por usuario.'},
      },
    },
    learning: {
      badge: 'LMS',
      title: 'Cursos, lecciones y rutas de aprendizaje',
      intro: 'Diseña rutas completas: secciones, lecciones, bloques polimórficos y publicación controlada — cada curso permanece dentro de los idiomas de tu dominio.',
      features: {
        catalog: {title: 'Catálogo buscable', description: 'Tus alumnos navegan por los cursos por palabra clave, nivel y dominio, con una tarjeta de vista previa por curso.'},
        structure: {title: 'Curso → Secciones → Lecciones', description: 'Una jerarquía clara para organizar las rutas: las secciones agrupan las lecciones, las lecciones albergan los bloques.'},
        blocks: {title: '8 tipos de bloques', description: 'Texto enriquecido, imagen, vídeo, archivo, cuestionario, callout, código, iframe — cada tipo tiene su editor dedicado.'},
        editor: {title: 'Editor drag-and-drop', description: 'Reordena los bloques de una lección con arrastrar y soltar. Cada bloque se edita con un botón Guardar / Cancelar explícito — sin guardado silencioso. Misma UX para secciones y lecciones de un curso.'},
        calloutVariants: {title: 'Variantes de aviso', description: 'Los bloques de aviso llevan una variante semántica (info / éxito / advertencia / error) que colorea el borde izquierdo.'},
        translations: {title: 'Traducciones por bloque', description: 'Pestañas de idioma en cada editor de bloque, con un botón "traducir desde la pestaña activa" que rellena los huecos vía DeepL.'},
        viewAsLearner: {title: 'Vista alumno', description: 'Botón ojo para previsualizar una lección tal como la ve un estudiante, sin los controles de edición.'},
        publish: {title: 'Publicar, despublicar, clonar', description: 'Workflow borrador → publicado, vuelta a borrador cuando hace falta, clonación en un clic para una variante.'},
        safeHtml: {title: 'HTML saneado', description: 'El texto enriquecido pasa por nh3 con una allowlist estricta (CSS de Quill permitido, scripts y URL exóticas eliminadas).'},
        multilingual: {title: 'Multilingüe por dominio', description: 'El curso y sus traducciones están limitados a Domain.allowed_languages. Sin idiomas accidentales.'},
      },
    },
    enrollment: {
      badge: 'Inscripciones',
      title: 'De la inscripción al certificado',
      intro: 'Tres modos de inscripción, progreso seguido lección a lección, cuestionarios de validación y certificados PDF auto-generados — el ciclo completo del alumno.',
      features: {
        modes: {title: '3 modos de inscripción', description: 'Abierto (auto-inscripción), bajo solicitud (moderado por el instructor), o solo por invitación.'},
        invites: {title: 'Invitaciones por email', description: 'Invita alumnos en masa con un plazo y recordatorio automático antes de la expiración.'},
        progress: {title: 'Seguimiento de progreso', description: 'Cada lección completada actualiza el porcentaje de finalización del curso, persistido por usuario.'},
        validationQuiz: {title: 'Cuestionario de validación', description: 'Adjunta un cuestionario a una lección: hasta alcanzar la puntuación mínima, la lección queda sin validar.'},
        finalQuiz: {title: 'Cuestionario final + certificado', description: 'Aprobar el cuestionario final activa la emisión del certificado — umbral configurable por el instructor.'},
        certificates: {title: 'Certificados PDF', description: 'Renderización PDF asíncrona vía Celery + reportlab, con numeración secuencial por curso.'},
        verification: {title: 'Verificación pública', description: 'Cada certificado tiene una URL pública de verificación — firmada, anti-manipulación, anon-throttled.'},
        emails: {title: '5 emails localizados', description: 'Inscripción creada, aprobada, rechazada, curso completado, certificado emitido — cada uno traducido a FR/EN/NL/IT/ES vía gettext.'},
        analytics: {title: 'Analytics por curso', description: 'Recuento de inscritos, tasa de finalización, progreso mediano y tendencia de inscripciones a 30 días.'},
        dashboard: {title: 'Panel del alumno', description: 'La página /dashboard agrupa cursos en curso, certificados, cuestionarios pendientes y el catálogo.'},
      },
    },
    platform: {
      badge: 'Plataforma',
      title: 'Una infraestructura lista para producción',
      intro: 'Todo lo que hace la plataforma fiable, multilingüe y observable cada día.',
      features: {
        auth: {title: 'Auth JWT y confirmación email', description: 'Registro, confirmación de email y restablecimiento de contraseña seguros.'},
        magicLink: {title: 'Inicio con magic link', description: 'Autenticación sin contraseña: basta con un enlace firmado recibido por email para acceder.'},
        notificationPrefs: {title: 'Preferencias de notificación', description: 'Cada usuario elige qué correos recibe, por categoría (solicitudes, invitaciones, transferencias).'},
        multilingual: {title: 'UI multilingüe', description: 'Cinco idiomas en la interfaz: FR, EN, NL, IT, ES.'},
        outbox: {title: 'Outbox + Celery', description: 'Entrega asíncrona fiable con retry y backoff. SMTP o Microsoft Graph.'},
        dashboard: {title: 'Panel de admin', description: 'KPIs Chart.js: usuarios activos, dominios, preguntas y sesiones.'},
        diagnostics: {title: 'Diagnóstico del sistema', description: 'Snapshot en vivo de DB, email, upload y DeepL con checks bajo demanda.'},
        rateLimit: {title: 'Rate limiting', description: 'Endpoints públicos y sensibles protegidos vía ScopedRateThrottle.'},
        api: {title: 'Cliente OpenAPI', description: 'Esquema drf-spectacular con cliente TypeScript generado automáticamente.'},
      },
    },
  },
};

function buildUiText(content: FeaturesContent): FeaturesUiText {
  return {
    eyebrow: content.eyebrow,
    title: content.title,
    intro: content.intro,
    ctaPrimary: content.ctaPrimary,
    ctaSecondary: content.ctaSecondary,
    ctaLoggedIn: content.ctaLoggedIn,
    sections: SECTION_DEFS.map((def) => {
      const sec = content.sections[def.slug];
      return {
        slug: def.slug,
        icon: def.icon,
        badge: sec.badge,
        title: sec.title,
        intro: sec.intro,
        features: def.features.map((f) => {
          const featureContent = sec.features[f.key];
          return {
            icon: f.icon,
            title: featureContent.title,
            description: featureContent.description,
          };
        }),
      };
    }),
  };
}

const CONTENT_BY_LANG: Partial<Record<LanguageEnumDto, FeaturesContent>> = {
  [LanguageEnumDto.Fr]: FR_CONTENT,
  [LanguageEnumDto.En]: EN_CONTENT,
  [LanguageEnumDto.Nl]: NL_CONTENT,
  [LanguageEnumDto.It]: IT_CONTENT,
  [LanguageEnumDto.Es]: ES_CONTENT,
};

export function getFeaturesUiText(lang: LanguageEnumDto | string | null | undefined): FeaturesUiText {
  return buildUiText(CONTENT_BY_LANG[lang as LanguageEnumDto] ?? EN_CONTENT);
}
