import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the course-edit "Analytics" tab. KPIs are
 * aggregated client-side from the enrollment list endpoint (see
 * :class:`CourseEditAnalyticsTab`); this dictionary owns every
 * visible string surfaced by that panel — labels, hints, error /
 * empty states.
 *
 * Five languages (FR/EN/NL/IT/ES) are mandatory; the i18n
 * completeness check (``scripts/check-i18n.ts``) fails the build
 * otherwise.
 */
export interface CourseEditAnalyticsTabUiText {
  heading: string;
  subtitle: string;
  kpi: {
    total: string;
    active: string;
    pending: string;
    completed: string;
    cancelled: string;
    completionRate: string;
    lastEnrollment: string;
    lastCompletion: string;
    medianProgress: string;
    certificatesIssued: string;
  };
  trendHeading: string;
  trendSubtitle: string;
  invite: {
    heading: string;
    subtitle: string;
    kpi: {
      total: string;
      pending: string;
      accepted: string;
      declined: string;
      revoked: string;
      expired: string;
      acceptanceRate: string;
      medianDecisionHours: string;
    };
    decisionHoursValue: (hours: number) => string;
  };
  auditHeading: string;
  auditEmpty: string;
  /** Localized action labels — back-end actions are free-form strings
   *  like ``course.publish`` / ``course.unpublish`` / ``course.clone``;
   *  the resolver below maps them to a learner-friendly verb and a
   *  fallback (the raw key) for any future action not listed here. */
  auditAction: (rawAction: string) => string;
  kpiHints: {
    pctOfTotal: (pct: number) => string;
    neverYet: string;
  };
  errors: {
    loadFailed: string;
  };
  retryButton: string;
  emptyTitle: string;
  emptyMessage: string;
}

export function getCourseEditAnalyticsTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditAnalyticsTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Analyses',
        subtitle:
          'Indicateurs d’inscription agrégés à partir des inscriptions de ce cours.',
        kpi: {
          total: 'Inscriptions totales',
          active: 'Actives',
          pending: 'En attente',
          completed: 'Terminées',
          cancelled: 'Annulées',
          completionRate: 'Taux de réussite',
          lastEnrollment: 'Dernière inscription',
          lastCompletion: 'Dernière complétion',
          medianProgress: 'Progression médiane',
          certificatesIssued: 'Certificats émis',
        },
        trendHeading: 'Inscriptions sur 30 jours',
        trendSubtitle: 'Nombre de nouvelles inscriptions par jour, fenêtre glissante.',
        invite: {
          heading: 'Invitations',
          subtitle: 'Indicateurs des invitations envoyées sur ce cours.',
          kpi: {
            total: 'Total envoyées',
            pending: 'En attente',
            accepted: 'Acceptées',
            declined: 'Refusées',
            revoked: 'Révoquées',
            expired: 'Expirées',
            acceptanceRate: 'Taux d’acceptation',
            medianDecisionHours: 'Délai médian de décision',
          },
          decisionHoursValue: (hours) => `${hours} h`,
        },
        auditHeading: 'Activité récente',
        auditEmpty: 'Aucune action enregistrée pour le moment.',
        auditAction: (a) => ({
          'course.publish': 'Publication',
          'course.unpublish': 'Dépublication',
          'course.clone': 'Duplication',
        }[a] ?? a),
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % du total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Impossible de charger les analyses.',
        },
        retryButton: 'Réessayer',
        emptyTitle: 'Aucune inscription pour le moment',
        emptyMessage:
          'Les statistiques apparaîtront dès que des apprenants s’inscriront à ce cours.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Analyses',
        subtitle:
          'Inschrijvingsindicatoren samengevat op basis van de inschrijvingen van deze cursus.',
        kpi: {
          total: 'Totaal inschrijvingen',
          active: 'Actief',
          pending: 'In afwachting',
          completed: 'Voltooid',
          cancelled: 'Geannuleerd',
          completionRate: 'Voltooiingspercentage',
          lastEnrollment: 'Laatste inschrijving',
          lastCompletion: 'Laatste voltooiing',
          medianProgress: 'Mediane voortgang',
          certificatesIssued: 'Uitgegeven certificaten',
        },
        trendHeading: 'Inschrijvingen over 30 dagen',
        trendSubtitle: 'Aantal nieuwe inschrijvingen per dag, voortschrijdend venster.',
        invite: {
          heading: 'Uitnodigingen',
          subtitle: 'Indicatoren van uitnodigingen die voor deze cursus zijn verzonden.',
          kpi: {
            total: 'Totaal verzonden',
            pending: 'In behandeling',
            accepted: 'Geaccepteerd',
            declined: 'Geweigerd',
            revoked: 'Ingetrokken',
            expired: 'Verlopen',
            acceptanceRate: 'Acceptatiepercentage',
            medianDecisionHours: 'Mediaan beslistijd',
          },
          decisionHoursValue: (hours) => `${hours} u`,
        },
        auditHeading: 'Recente activiteit',
        auditEmpty: 'Nog geen geregistreerde actie.',
        auditAction: (a) => ({
          'course.publish': 'Publicatie',
          'course.unpublish': 'Depublicatie',
          'course.clone': 'Duplicatie',
        }[a] ?? a),
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % van het totaal`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Analyses konden niet worden geladen.',
        },
        retryButton: 'Opnieuw proberen',
        emptyTitle: 'Nog geen inschrijvingen',
        emptyMessage:
          'Statistieken verschijnen zodra cursisten zich voor deze cursus inschrijven.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Analisi',
        subtitle:
          'Indicatori di iscrizione aggregati dalle iscrizioni di questo corso.',
        kpi: {
          total: 'Iscrizioni totali',
          active: 'Attive',
          pending: 'In attesa',
          completed: 'Completate',
          cancelled: 'Annullate',
          completionRate: 'Tasso di completamento',
          lastEnrollment: 'Ultima iscrizione',
          lastCompletion: 'Ultimo completamento',
          medianProgress: 'Progresso mediano',
          certificatesIssued: 'Certificati emessi',
        },
        trendHeading: 'Iscrizioni a 30 giorni',
        trendSubtitle: 'Numero di nuove iscrizioni al giorno, finestra mobile.',
        invite: {
          heading: 'Inviti',
          subtitle: 'Indicatori degli inviti inviati per questo corso.',
          kpi: {
            total: 'Totale inviati',
            pending: 'In attesa',
            accepted: 'Accettati',
            declined: 'Rifiutati',
            revoked: 'Revocati',
            expired: 'Scaduti',
            acceptanceRate: 'Tasso di accettazione',
            medianDecisionHours: 'Tempo mediano di decisione',
          },
          decisionHoursValue: (hours) => `${hours} h`,
        },
        auditHeading: 'Attività recente',
        auditEmpty: 'Nessuna azione registrata al momento.',
        auditAction: (a) => ({
          'course.publish': 'Pubblicazione',
          'course.unpublish': 'Annullamento pubblicazione',
          'course.clone': 'Duplicazione',
        }[a] ?? a),
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % del totale`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Impossibile caricare le analisi.',
        },
        retryButton: 'Riprova',
        emptyTitle: 'Nessuna iscrizione al momento',
        emptyMessage:
          'Le statistiche appariranno non appena alcuni studenti si iscriveranno a questo corso.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Analíticas',
        subtitle:
          'Indicadores de inscripción agregados a partir de las inscripciones de este curso.',
        kpi: {
          total: 'Inscripciones totales',
          active: 'Activas',
          pending: 'Pendientes',
          completed: 'Completadas',
          cancelled: 'Canceladas',
          completionRate: 'Tasa de finalización',
          lastEnrollment: 'Última inscripción',
          lastCompletion: 'Última finalización',
          medianProgress: 'Progreso mediano',
          certificatesIssued: 'Certificados emitidos',
        },
        trendHeading: 'Inscripciones a 30 días',
        trendSubtitle: 'Número de nuevas inscripciones por día, ventana deslizante.',
        invite: {
          heading: 'Invitaciones',
          subtitle: 'Indicadores de las invitaciones enviadas para este curso.',
          kpi: {
            total: 'Total enviadas',
            pending: 'Pendientes',
            accepted: 'Aceptadas',
            declined: 'Rechazadas',
            revoked: 'Revocadas',
            expired: 'Caducadas',
            acceptanceRate: 'Tasa de aceptación',
            medianDecisionHours: 'Tiempo medio de decisión',
          },
          decisionHoursValue: (hours) => `${hours} h`,
        },
        auditHeading: 'Actividad reciente',
        auditEmpty: 'Aún no hay acción registrada.',
        auditAction: (a) => ({
          'course.publish': 'Publicación',
          'course.unpublish': 'Anular publicación',
          'course.clone': 'Duplicación',
        }[a] ?? a),
        kpiHints: {
          pctOfTotal: (pct) => `${pct} % del total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'No se pudieron cargar las analíticas.',
        },
        retryButton: 'Reintentar',
        emptyTitle: 'Aún no hay inscripciones',
        emptyMessage:
          'Las estadísticas aparecerán en cuanto los estudiantes se inscriban en este curso.',
      };
    default:
      return {
        heading: 'Analytics',
        subtitle: 'Enrollment KPIs aggregated from this course’s enrollments.',
        kpi: {
          total: 'Total enrollments',
          active: 'Active',
          pending: 'Pending',
          completed: 'Completed',
          cancelled: 'Cancelled',
          completionRate: 'Completion rate',
          lastEnrollment: 'Last enrollment',
          lastCompletion: 'Last completion',
          medianProgress: 'Median progress',
          certificatesIssued: 'Certificates issued',
        },
        trendHeading: 'Enrollments over 30 days',
        trendSubtitle: 'Number of new enrollments per day, rolling window.',
        invite: {
          heading: 'Invitations',
          subtitle: 'Metrics on the invitations sent for this course.',
          kpi: {
            total: 'Total sent',
            pending: 'Pending',
            accepted: 'Accepted',
            declined: 'Declined',
            revoked: 'Revoked',
            expired: 'Expired',
            acceptanceRate: 'Acceptance rate',
            medianDecisionHours: 'Median decision time',
          },
          decisionHoursValue: (hours) => `${hours} h`,
        },
        auditHeading: 'Recent activity',
        auditEmpty: 'No action recorded yet.',
        auditAction: (a) => ({
          'course.publish': 'Published',
          'course.unpublish': 'Unpublished',
          'course.clone': 'Cloned',
        }[a] ?? a),
        kpiHints: {
          pctOfTotal: (pct) => `${pct}% of total`,
          neverYet: '—',
        },
        errors: {
          loadFailed: 'Could not load analytics.',
        },
        retryButton: 'Retry',
        emptyTitle: 'No enrollments yet',
        emptyMessage:
          'Stats will appear here as soon as learners enroll in this course.',
      };
  }
}
