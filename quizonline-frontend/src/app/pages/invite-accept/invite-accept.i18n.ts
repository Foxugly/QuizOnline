import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type InviteAcceptUiText = {
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
    readyExplain: (domainName: string, inviterUsername: string) => string;
    accept: string;
    accepting: string;
    accepted: string;
    alreadyMember: string;
    wrongAccount: (expectedEmail: string) => string;
    loginRequired: string;
    loginCta: string;
    signupRequired: string;
    signupCta: string;
  };
  buttons: {
    backHome: string;
  };
};

const FR: InviteAcceptUiText = {
  title: 'Invitation à rejoindre un domaine',
  loading: 'Chargement de l\'invitation…',
  errors: {
    tokenInvalid: 'Lien invalide.',
    tokenExpired: 'Lien expiré.',
    generic: 'Une erreur est survenue.',
    notFound: 'Ce domaine n\'existe plus ou n\'est plus actif.',
  },
  states: {
    readyHeading: 'Prêt à rejoindre',
    readyExplain: (domainName, inviterUsername) => `Vous avez été invité à rejoindre « ${domainName} » par ${inviterUsername}.`,
    accept: 'Accepter l\'invitation',
    accepting: 'Acceptation…',
    accepted: 'Vous faites maintenant partie du domaine.',
    alreadyMember: 'Vous êtes déjà membre de ce domaine.',
    wrongAccount: (expectedEmail) => `Ce lien est destiné à ${expectedEmail}. Connectez-vous avec ce compte.`,
    loginRequired: 'Un compte existe pour cette adresse. Connectez-vous pour accepter l\'invitation.',
    loginCta: 'Se connecter',
    signupRequired: 'Aucun compte pour cette adresse. Créez-en un pour accepter l\'invitation.',
    signupCta: 'Créer un compte',
  },
  buttons: {
    backHome: 'Retour à l\'accueil',
  },
};

const EN: InviteAcceptUiText = {
  title: 'Invitation to join a domain',
  loading: 'Loading the invitation…',
  errors: {
    tokenInvalid: 'Invalid link.',
    tokenExpired: 'Expired link.',
    generic: 'Something went wrong.',
    notFound: 'This domain no longer exists or is no longer active.',
  },
  states: {
    readyHeading: 'Ready to join',
    readyExplain: (domainName, inviterUsername) => `You have been invited to join "${domainName}" by ${inviterUsername}.`,
    accept: 'Accept invitation',
    accepting: 'Accepting…',
    accepted: 'You are now part of the domain.',
    alreadyMember: 'You are already a member of this domain.',
    wrongAccount: (expectedEmail) => `This link is for ${expectedEmail}. Sign in with that account.`,
    loginRequired: 'An account exists for this address. Sign in to accept the invitation.',
    loginCta: 'Sign in',
    signupRequired: 'No account for this address. Create one to accept the invitation.',
    signupCta: 'Create account',
  },
  buttons: {
    backHome: 'Back to home',
  },
};

const NL: InviteAcceptUiText = {
  title: 'Uitnodiging om een domein te vervoegen',
  loading: 'Uitnodiging wordt geladen…',
  errors: {
    tokenInvalid: 'Ongeldige link.',
    tokenExpired: 'Verlopen link.',
    generic: 'Er is iets misgegaan.',
    notFound: 'Dit domein bestaat niet meer of is niet meer actief.',
  },
  states: {
    readyHeading: 'Klaar om aan te sluiten',
    readyExplain: (domainName, inviterUsername) => `U bent uitgenodigd om "${domainName}" te vervoegen door ${inviterUsername}.`,
    accept: 'Uitnodiging aanvaarden',
    accepting: 'Aanvaarden…',
    accepted: 'U maakt nu deel uit van het domein.',
    alreadyMember: 'U bent al lid van dit domein.',
    wrongAccount: (expectedEmail) => `Deze link is bestemd voor ${expectedEmail}. Log in met dat account.`,
    loginRequired: 'Er bestaat al een account voor dit adres. Log in om de uitnodiging te aanvaarden.',
    loginCta: 'Inloggen',
    signupRequired: 'Geen account voor dit adres. Maak er een aan om de uitnodiging te aanvaarden.',
    signupCta: 'Account aanmaken',
  },
  buttons: {
    backHome: 'Terug naar home',
  },
};

const IT: InviteAcceptUiText = {
  title: 'Invito a unirsi a un dominio',
  loading: 'Caricamento dell\'invito…',
  errors: {
    tokenInvalid: 'Link non valido.',
    tokenExpired: 'Link scaduto.',
    generic: 'Qualcosa è andato storto.',
    notFound: 'Questo dominio non esiste più o non è più attivo.',
  },
  states: {
    readyHeading: 'Pronto a entrare',
    readyExplain: (domainName, inviterUsername) => `Sei stato invitato a unirti a "${domainName}" da ${inviterUsername}.`,
    accept: 'Accetta l\'invito',
    accepting: 'Accettazione in corso…',
    accepted: 'Ora fai parte del dominio.',
    alreadyMember: 'Sei già un membro di questo dominio.',
    wrongAccount: (expectedEmail) => `Questo link è per ${expectedEmail}. Accedi con quell'account.`,
    loginRequired: 'Esiste già un account per questo indirizzo. Accedi per accettare l\'invito.',
    loginCta: 'Accedi',
    signupRequired: 'Nessun account per questo indirizzo. Creane uno per accettare l\'invito.',
    signupCta: 'Crea un account',
  },
  buttons: {
    backHome: 'Torna alla home',
  },
};

const ES: InviteAcceptUiText = {
  title: 'Invitación a unirse a un dominio',
  loading: 'Cargando la invitación…',
  errors: {
    tokenInvalid: 'Enlace no válido.',
    tokenExpired: 'Enlace caducado.',
    generic: 'Algo salió mal.',
    notFound: 'Este dominio ya no existe o ya no está activo.',
  },
  states: {
    readyHeading: 'Listo para unirse',
    readyExplain: (domainName, inviterUsername) => `Has sido invitado a unirte a "${domainName}" por ${inviterUsername}.`,
    accept: 'Aceptar la invitación',
    accepting: 'Aceptando…',
    accepted: 'Ahora formas parte del dominio.',
    alreadyMember: 'Ya eres miembro de este dominio.',
    wrongAccount: (expectedEmail) => `Este enlace es para ${expectedEmail}. Inicia sesión con esa cuenta.`,
    loginRequired: 'Ya existe una cuenta para esta dirección. Inicia sesión para aceptar la invitación.',
    loginCta: 'Iniciar sesión',
    signupRequired: 'No hay cuenta para esta dirección. Crea una para aceptar la invitación.',
    signupCta: 'Crear cuenta',
  },
  buttons: {
    backHome: 'Volver al inicio',
  },
};

const DICT: Record<LanguageEnumDto, InviteAcceptUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getInviteAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): InviteAcceptUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
