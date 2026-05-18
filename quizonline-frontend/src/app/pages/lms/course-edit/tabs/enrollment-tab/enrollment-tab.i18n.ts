import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Enrollment" tab. Surfaces the localized
 * labels for the enrollment table (status filter, column headers,
 * per-row action buttons + confirm dialogs and the empty state) plus
 * the toast strings raised after an approve / reject / cancel
 * round-trip with the backend. All five languages stay aligned
 * (enforced by ``scripts/check-i18n.ts`` in pre-commit).
 */
export interface LmsCourseEditEnrollmentTabUiText {
  heading: string;
  subtitle: string;

  filters: {
    status: {
      label: string;
      all: string;
    };
  };

  columns: {
    user: string;
    email: string;
    status: string;
    enrolledAt: string;
    completedAt: string;
    actions: string;
  };

  actions: {
    approve: string;
    reject: string;
    cancel: string;
    confirmHeader: string;
    confirmAccept: string;
    confirmReject: string;
    confirmApprove: (name: string) => string;
    confirmRejectMessage: (name: string) => string;
    confirmCancel: (name: string) => string;
  };

  emptyTitle: string;
  emptyMessage: string;
  noCompletedAt: string;

  toasts: {
    approveSuccess: string;
    approveFailed: string;
    rejectSuccess: string;
    rejectFailed: string;
    cancelSuccess: string;
    cancelFailed: string;
    loadFailed: string;
    errorSummary: string;
  };
}

export function getLmsCourseEditEnrollmentTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditEnrollmentTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Inscriptions',
        subtitle: 'Approuvez, refusez ou annulez les inscriptions des apprenants à ce cours.',
        filters: {
          status: {
            label: 'Statut',
            all: 'Tous',
          },
        },
        columns: {
          user: 'Utilisateur',
          email: 'E-mail',
          status: 'Statut',
          enrolledAt: 'Inscrit le',
          completedAt: 'Terminé le',
          actions: 'Actions',
        },
        actions: {
          approve: 'Approuver',
          reject: 'Refuser',
          cancel: 'Annuler l’inscription',
          confirmHeader: 'Confirmer',
          confirmAccept: 'Confirmer',
          confirmReject: 'Annuler',
          confirmApprove: (name) => `Approuver l’inscription de ${name} ?`,
          confirmRejectMessage: (name) => `Refuser l’inscription de ${name} ?`,
          confirmCancel: (name) => `Annuler l’inscription de ${name} ?`,
        },
        emptyTitle: 'Aucune inscription',
        emptyMessage: 'Aucune inscription ne correspond au filtre courant.',
        noCompletedAt: '—',
        toasts: {
          approveSuccess: 'Inscription approuvée.',
          approveFailed: 'Échec de l’approbation de l’inscription.',
          rejectSuccess: 'Inscription refusée.',
          rejectFailed: 'Échec du refus de l’inscription.',
          cancelSuccess: 'Inscription annulée.',
          cancelFailed: 'Échec de l’annulation de l’inscription.',
          loadFailed: 'Impossible de charger les inscriptions.',
          errorSummary: 'Erreur',
        },
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Inschrijvingen',
        subtitle: 'Keur inschrijvingen voor deze cursus goed, weiger ze of annuleer ze.',
        filters: {
          status: {
            label: 'Status',
            all: 'Alle',
          },
        },
        columns: {
          user: 'Gebruiker',
          email: 'E-mail',
          status: 'Status',
          enrolledAt: 'Ingeschreven op',
          completedAt: 'Voltooid op',
          actions: 'Acties',
        },
        actions: {
          approve: 'Goedkeuren',
          reject: 'Weigeren',
          cancel: 'Inschrijving annuleren',
          confirmHeader: 'Bevestigen',
          confirmAccept: 'Bevestigen',
          confirmReject: 'Annuleren',
          confirmApprove: (name) => `Inschrijving van ${name} goedkeuren?`,
          confirmRejectMessage: (name) => `Inschrijving van ${name} weigeren?`,
          confirmCancel: (name) => `Inschrijving van ${name} annuleren?`,
        },
        emptyTitle: 'Geen inschrijvingen',
        emptyMessage: 'Geen inschrijvingen voldoen aan het huidige filter.',
        noCompletedAt: '—',
        toasts: {
          approveSuccess: 'Inschrijving goedgekeurd.',
          approveFailed: 'Goedkeuren van inschrijving mislukt.',
          rejectSuccess: 'Inschrijving geweigerd.',
          rejectFailed: 'Weigeren van inschrijving mislukt.',
          cancelSuccess: 'Inschrijving geannuleerd.',
          cancelFailed: 'Annuleren van inschrijving mislukt.',
          loadFailed: 'Inschrijvingen konden niet worden geladen.',
          errorSummary: 'Fout',
        },
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Iscrizioni',
        subtitle: 'Approva, rifiuta o annulla le iscrizioni degli studenti a questo corso.',
        filters: {
          status: {
            label: 'Stato',
            all: 'Tutti',
          },
        },
        columns: {
          user: 'Utente',
          email: 'E-mail',
          status: 'Stato',
          enrolledAt: 'Iscritto il',
          completedAt: 'Completato il',
          actions: 'Azioni',
        },
        actions: {
          approve: 'Approva',
          reject: 'Rifiuta',
          cancel: 'Annulla iscrizione',
          confirmHeader: 'Conferma',
          confirmAccept: 'Conferma',
          confirmReject: 'Annulla',
          confirmApprove: (name) => `Approvare l’iscrizione di ${name}?`,
          confirmRejectMessage: (name) => `Rifiutare l’iscrizione di ${name}?`,
          confirmCancel: (name) => `Annullare l’iscrizione di ${name}?`,
        },
        emptyTitle: 'Nessuna iscrizione',
        emptyMessage: 'Nessuna iscrizione corrisponde al filtro corrente.',
        noCompletedAt: '—',
        toasts: {
          approveSuccess: 'Iscrizione approvata.',
          approveFailed: 'Approvazione dell’iscrizione non riuscita.',
          rejectSuccess: 'Iscrizione rifiutata.',
          rejectFailed: 'Rifiuto dell’iscrizione non riuscito.',
          cancelSuccess: 'Iscrizione annullata.',
          cancelFailed: 'Annullamento dell’iscrizione non riuscito.',
          loadFailed: 'Impossibile caricare le iscrizioni.',
          errorSummary: 'Errore',
        },
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Inscripciones',
        subtitle: 'Aprueba, rechaza o cancela las inscripciones de los alumnos en este curso.',
        filters: {
          status: {
            label: 'Estado',
            all: 'Todos',
          },
        },
        columns: {
          user: 'Usuario',
          email: 'Correo electrónico',
          status: 'Estado',
          enrolledAt: 'Inscrito el',
          completedAt: 'Completado el',
          actions: 'Acciones',
        },
        actions: {
          approve: 'Aprobar',
          reject: 'Rechazar',
          cancel: 'Cancelar inscripción',
          confirmHeader: 'Confirmar',
          confirmAccept: 'Confirmar',
          confirmReject: 'Cancelar',
          confirmApprove: (name) => `¿Aprobar la inscripción de ${name}?`,
          confirmRejectMessage: (name) => `¿Rechazar la inscripción de ${name}?`,
          confirmCancel: (name) => `¿Cancelar la inscripción de ${name}?`,
        },
        emptyTitle: 'Sin inscripciones',
        emptyMessage: 'Ninguna inscripción coincide con el filtro actual.',
        noCompletedAt: '—',
        toasts: {
          approveSuccess: 'Inscripción aprobada.',
          approveFailed: 'No se pudo aprobar la inscripción.',
          rejectSuccess: 'Inscripción rechazada.',
          rejectFailed: 'No se pudo rechazar la inscripción.',
          cancelSuccess: 'Inscripción cancelada.',
          cancelFailed: 'No se pudo cancelar la inscripción.',
          loadFailed: 'No se pudieron cargar las inscripciones.',
          errorSummary: 'Error',
        },
      };
    default:
      return {
        heading: 'Enrollments',
        subtitle: 'Approve, reject or cancel learners’ enrollments in this course.',
        filters: {
          status: {
            label: 'Status',
            all: 'All',
          },
        },
        columns: {
          user: 'User',
          email: 'Email',
          status: 'Status',
          enrolledAt: 'Enrolled at',
          completedAt: 'Completed at',
          actions: 'Actions',
        },
        actions: {
          approve: 'Approve',
          reject: 'Reject',
          cancel: 'Cancel enrollment',
          confirmHeader: 'Confirm',
          confirmAccept: 'Confirm',
          confirmReject: 'Cancel',
          confirmApprove: (name) => `Approve ${name}'s enrollment?`,
          confirmRejectMessage: (name) => `Reject ${name}'s enrollment?`,
          confirmCancel: (name) => `Cancel ${name}'s enrollment?`,
        },
        emptyTitle: 'No enrollments',
        emptyMessage: 'No enrollments match the current filter.',
        noCompletedAt: '—',
        toasts: {
          approveSuccess: 'Enrollment approved.',
          approveFailed: 'Failed to approve the enrollment.',
          rejectSuccess: 'Enrollment rejected.',
          rejectFailed: 'Failed to reject the enrollment.',
          cancelSuccess: 'Enrollment cancelled.',
          cancelFailed: 'Failed to cancel the enrollment.',
          loadFailed: 'Failed to load enrollments.',
          errorSummary: 'Error',
        },
      };
  }
}
