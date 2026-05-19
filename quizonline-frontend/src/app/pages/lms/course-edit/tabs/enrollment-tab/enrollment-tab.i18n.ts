import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Enrollment" tab. Surfaces the localized
 * labels for the enrollment table (status filter, column headers,
 * per-row action buttons + confirm dialogs and the empty state) plus
 * the toast strings raised after an approve / reject / cancel
 * round-trip with the backend. The ``invite`` sub-tree carries the
 * matching strings for the course-invite section that surfaces on
 * ``ENROLL_INVITE`` courses. All five languages stay aligned
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

  invite: {
    heading: string;
    subtitle: string;
    pickerLabel: string;
    pickerPlaceholder: string;
    sendButton: string;
    pendingListHeading: string;
    columns: {
      user: string;
      sentAt: string;
      expiresAt: string;
      status: string;
      actions: string;
    };
    statusLabels: {
      pending: string;
      accepted: string;
      declined: string;
      revoked: string;
      expired: string;
    };
    actions: {
      resend: string;
      revoke: string;
      confirmResend: (name: string) => string;
      confirmRevoke: (name: string) => string;
    };
    emptyTitle: string;
    toasts: {
      sendSuccess: string;
      sendFailed: string;
      resendSuccess: string;
      resendFailed: string;
      revokeSuccess: string;
      revokeFailed: string;
      loadFailed: string;
    };
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
        invite: {
          heading: 'Inviter un apprenant',
          subtitle:
            'Les apprenants invités reçoivent un email avec un lien pour accepter l’invitation.',
          pickerLabel: 'Apprenant',
          pickerPlaceholder: 'Chercher un membre du domaine…',
          sendButton: 'Envoyer l’invitation',
          pendingListHeading: 'Invitations en cours',
          columns: {
            user: 'Apprenant',
            sentAt: 'Envoyée',
            expiresAt: 'Expire',
            status: 'Statut',
            actions: 'Actions',
          },
          statusLabels: {
            pending: 'En attente',
            accepted: 'Acceptée',
            declined: 'Refusée',
            revoked: 'Révoquée',
            expired: 'Expirée',
          },
          actions: {
            resend: 'Renvoyer',
            revoke: 'Révoquer',
            confirmResend: (name) => `Renvoyer l’invitation à ${name} ?`,
            confirmRevoke: (name) => `Révoquer l’invitation envoyée à ${name} ?`,
          },
          emptyTitle: 'Aucune invitation en cours.',
          toasts: {
            sendSuccess: 'Invitation envoyée.',
            sendFailed: 'L’envoi de l’invitation a échoué.',
            resendSuccess: 'Invitation renvoyée.',
            resendFailed: 'Le renvoi de l’invitation a échoué.',
            revokeSuccess: 'Invitation révoquée.',
            revokeFailed: 'La révocation de l’invitation a échoué.',
            loadFailed: 'Impossible de charger les invitations.',
          },
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
        invite: {
          heading: 'Een cursist uitnodigen',
          subtitle:
            'Uitgenodigde cursisten ontvangen een e-mail met een link om de uitnodiging te accepteren.',
          pickerLabel: 'Cursist',
          pickerPlaceholder: 'Zoek een lid van het domein…',
          sendButton: 'Uitnodiging verzenden',
          pendingListHeading: 'Lopende uitnodigingen',
          columns: {
            user: 'Cursist',
            sentAt: 'Verzonden',
            expiresAt: 'Vervalt',
            status: 'Status',
            actions: 'Acties',
          },
          statusLabels: {
            pending: 'In behandeling',
            accepted: 'Geaccepteerd',
            declined: 'Geweigerd',
            revoked: 'Ingetrokken',
            expired: 'Verlopen',
          },
          actions: {
            resend: 'Opnieuw verzenden',
            revoke: 'Intrekken',
            confirmResend: (name) => `Uitnodiging opnieuw verzenden naar ${name}?`,
            confirmRevoke: (name) => `Uitnodiging aan ${name} intrekken?`,
          },
          emptyTitle: 'Geen lopende uitnodigingen.',
          toasts: {
            sendSuccess: 'Uitnodiging verzonden.',
            sendFailed: 'Uitnodiging verzenden is mislukt.',
            resendSuccess: 'Uitnodiging opnieuw verzonden.',
            resendFailed: 'Uitnodiging opnieuw verzenden is mislukt.',
            revokeSuccess: 'Uitnodiging ingetrokken.',
            revokeFailed: 'Uitnodiging intrekken is mislukt.',
            loadFailed: 'Uitnodigingen konden niet worden geladen.',
          },
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
        invite: {
          heading: 'Invita uno studente',
          subtitle:
            'Gli studenti invitati riceveranno un’email con un link per accettare l’invito.',
          pickerLabel: 'Studente',
          pickerPlaceholder: 'Cerca un membro del dominio…',
          sendButton: 'Invia invito',
          pendingListHeading: 'Inviti in corso',
          columns: {
            user: 'Studente',
            sentAt: 'Inviato',
            expiresAt: 'Scade',
            status: 'Stato',
            actions: 'Azioni',
          },
          statusLabels: {
            pending: 'In attesa',
            accepted: 'Accettato',
            declined: 'Rifiutato',
            revoked: 'Revocato',
            expired: 'Scaduto',
          },
          actions: {
            resend: 'Rinvia',
            revoke: 'Revoca',
            confirmResend: (name) => `Rinviare l’invito a ${name}?`,
            confirmRevoke: (name) => `Revocare l’invito inviato a ${name}?`,
          },
          emptyTitle: 'Nessun invito in corso.',
          toasts: {
            sendSuccess: 'Invito inviato.',
            sendFailed: 'Invio dell’invito non riuscito.',
            resendSuccess: 'Invito rinviato.',
            resendFailed: 'Rinvio dell’invito non riuscito.',
            revokeSuccess: 'Invito revocato.',
            revokeFailed: 'Revoca dell’invito non riuscita.',
            loadFailed: 'Impossibile caricare gli inviti.',
          },
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
        invite: {
          heading: 'Invitar a un alumno',
          subtitle:
            'Los alumnos invitados recibirán un correo electrónico con un enlace para aceptar la invitación.',
          pickerLabel: 'Alumno',
          pickerPlaceholder: 'Buscar un miembro del dominio…',
          sendButton: 'Enviar invitación',
          pendingListHeading: 'Invitaciones en curso',
          columns: {
            user: 'Alumno',
            sentAt: 'Enviada',
            expiresAt: 'Caduca',
            status: 'Estado',
            actions: 'Acciones',
          },
          statusLabels: {
            pending: 'Pendiente',
            accepted: 'Aceptada',
            declined: 'Rechazada',
            revoked: 'Revocada',
            expired: 'Caducada',
          },
          actions: {
            resend: 'Reenviar',
            revoke: 'Revocar',
            confirmResend: (name) => `¿Reenviar la invitación a ${name}?`,
            confirmRevoke: (name) => `¿Revocar la invitación enviada a ${name}?`,
          },
          emptyTitle: 'No hay invitaciones en curso.',
          toasts: {
            sendSuccess: 'Invitación enviada.',
            sendFailed: 'No se pudo enviar la invitación.',
            resendSuccess: 'Invitación reenviada.',
            resendFailed: 'No se pudo reenviar la invitación.',
            revokeSuccess: 'Invitación revocada.',
            revokeFailed: 'No se pudo revocar la invitación.',
            loadFailed: 'No se pudieron cargar las invitaciones.',
          },
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
        invite: {
          heading: 'Invite a learner',
          subtitle:
            'Invited learners receive an email with a link to accept the invitation.',
          pickerLabel: 'Learner',
          pickerPlaceholder: 'Search a domain member…',
          sendButton: 'Send invitation',
          pendingListHeading: 'Outstanding invitations',
          columns: {
            user: 'Learner',
            sentAt: 'Sent',
            expiresAt: 'Expires',
            status: 'Status',
            actions: 'Actions',
          },
          statusLabels: {
            pending: 'Pending',
            accepted: 'Accepted',
            declined: 'Declined',
            revoked: 'Revoked',
            expired: 'Expired',
          },
          actions: {
            resend: 'Resend',
            revoke: 'Revoke',
            confirmResend: (name) => `Resend the invitation to ${name}?`,
            confirmRevoke: (name) => `Revoke the invitation sent to ${name}?`,
          },
          emptyTitle: 'No outstanding invitations.',
          toasts: {
            sendSuccess: 'Invitation sent.',
            sendFailed: 'Failed to send the invitation.',
            resendSuccess: 'Invitation resent.',
            resendFailed: 'Failed to resend the invitation.',
            revokeSuccess: 'Invitation revoked.',
            revokeFailed: 'Failed to revoke the invitation.',
            loadFailed: 'Failed to load invitations.',
          },
        },
      };
  }
}
