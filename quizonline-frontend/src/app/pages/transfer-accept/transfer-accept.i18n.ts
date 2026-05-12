import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type TransferAcceptUiText = {
  title: string;
  loading: string;
  errors: {
    tokenInvalid: string;
    tokenExpired: string;
    generic: string;
    notFound: string;
  };
  states: {
    readyHeading: string;
    readyExplain: (domainName: string, initiatorUsername: string) => string;
    accept: string;
    accepting: string;
    transferred: string;
    wrongAccount: (futureOwnerUsername: string) => string;
    noLongerEligible: string;
  };
  buttons: {
    backHome: string;
  };
};

const FR: TransferAcceptUiText = {
  title: 'Transfert de propriété d\'un domaine',
  loading: 'Chargement…',
  errors: {
    tokenInvalid: 'Lien invalide.',
    tokenExpired: 'Lien expiré.',
    generic: 'Une erreur est survenue.',
    notFound: 'Ce domaine n\'existe plus ou n\'est plus actif.',
  },
  states: {
    readyHeading: 'Prêt à accepter',
    readyExplain: (domainName, initiatorUsername) => `${initiatorUsername} vous propose la propriété du domaine « ${domainName} ». En acceptant, vous devenez le propriétaire et l'ancien propriétaire devient simple membre.`,
    accept: 'Accepter le transfert',
    accepting: 'Acceptation…',
    transferred: 'Vous êtes maintenant le propriétaire de ce domaine.',
    wrongAccount: (futureOwnerUsername) => `Ce lien est destiné à ${futureOwnerUsername}. Connectez-vous avec ce compte.`,
    noLongerEligible: 'Ce transfert n\'est plus possible : la propriété du domaine a changé depuis l\'envoi du lien.',
  },
  buttons: {
    backHome: 'Retour à l\'accueil',
  },
};

const EN: TransferAcceptUiText = {
  title: 'Domain ownership transfer',
  loading: 'Loading…',
  errors: {
    tokenInvalid: 'Invalid link.',
    tokenExpired: 'Expired link.',
    generic: 'Something went wrong.',
    notFound: 'This domain no longer exists or is no longer active.',
  },
  states: {
    readyHeading: 'Ready to accept',
    readyExplain: (domainName, initiatorUsername) => `${initiatorUsername} is offering you the ownership of "${domainName}". By accepting you become the owner and the previous owner becomes a plain member.`,
    accept: 'Accept transfer',
    accepting: 'Accepting…',
    transferred: 'You are now the owner of this domain.',
    wrongAccount: (futureOwnerUsername) => `This link is for ${futureOwnerUsername}. Sign in with that account.`,
    noLongerEligible: 'This transfer is no longer possible: ownership has changed since the link was sent.',
  },
  buttons: {
    backHome: 'Back to home',
  },
};

const NL: TransferAcceptUiText = {
  title: 'Eigendomsoverdracht van een domein',
  loading: 'Laden…',
  errors: {
    tokenInvalid: 'Ongeldige link.',
    tokenExpired: 'Verlopen link.',
    generic: 'Er is iets misgegaan.',
    notFound: 'Dit domein bestaat niet meer of is niet meer actief.',
  },
  states: {
    readyHeading: 'Klaar om te aanvaarden',
    readyExplain: (domainName, initiatorUsername) => `${initiatorUsername} biedt u het eigenaarschap aan van "${domainName}". Door te aanvaarden wordt u eigenaar en wordt de vorige eigenaar gewoon lid.`,
    accept: 'Overdracht aanvaarden',
    accepting: 'Aanvaarden…',
    transferred: 'U bent nu de eigenaar van dit domein.',
    wrongAccount: (futureOwnerUsername) => `Deze link is bestemd voor ${futureOwnerUsername}. Log in met dat account.`,
    noLongerEligible: 'Deze overdracht is niet langer mogelijk: het eigenaarschap is intussen veranderd.',
  },
  buttons: {
    backHome: 'Terug naar home',
  },
};

const IT: TransferAcceptUiText = {
  title: 'Trasferimento di proprietà di un dominio',
  loading: 'Caricamento…',
  errors: {
    tokenInvalid: 'Link non valido.',
    tokenExpired: 'Link scaduto.',
    generic: 'Qualcosa è andato storto.',
    notFound: 'Questo dominio non esiste più o non è più attivo.',
  },
  states: {
    readyHeading: 'Pronto ad accettare',
    readyExplain: (domainName, initiatorUsername) => `${initiatorUsername} ti offre la proprietà di "${domainName}". Accettando diventi il proprietario e il proprietario precedente diventa un semplice membro.`,
    accept: 'Accetta il trasferimento',
    accepting: 'Accettazione in corso…',
    transferred: 'Ora sei il proprietario di questo dominio.',
    wrongAccount: (futureOwnerUsername) => `Questo link è per ${futureOwnerUsername}. Accedi con quell'account.`,
    noLongerEligible: 'Questo trasferimento non è più possibile: la proprietà è cambiata dopo l\'invio del link.',
  },
  buttons: {
    backHome: 'Torna alla home',
  },
};

const ES: TransferAcceptUiText = {
  title: 'Transferencia de propiedad de un dominio',
  loading: 'Cargando…',
  errors: {
    tokenInvalid: 'Enlace no válido.',
    tokenExpired: 'Enlace caducado.',
    generic: 'Algo salió mal.',
    notFound: 'Este dominio ya no existe o ya no está activo.',
  },
  states: {
    readyHeading: 'Listo para aceptar',
    readyExplain: (domainName, initiatorUsername) => `${initiatorUsername} te ofrece la propiedad de "${domainName}". Al aceptar te conviertes en propietario y el anterior propietario pasa a ser un miembro normal.`,
    accept: 'Aceptar la transferencia',
    accepting: 'Aceptando…',
    transferred: 'Ahora eres el propietario de este dominio.',
    wrongAccount: (futureOwnerUsername) => `Este enlace es para ${futureOwnerUsername}. Inicia sesión con esa cuenta.`,
    noLongerEligible: 'Esta transferencia ya no es posible: la propiedad ha cambiado desde que se envió el enlace.',
  },
  buttons: {
    backHome: 'Volver al inicio',
  },
};

const DICT: Record<LanguageEnumDto, TransferAcceptUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getTransferAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): TransferAcceptUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
