import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type DonateUiText = {
  eyebrow: string;
  title: string;
  lead: string;
  whyTitle: string;
  reasons: Array<{icon: string; title: string; description: string}>;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton: string;
  ctaNote: string;
  thanksTitle: string;
  thanksDescription: string;
};

const FR: DonateUiText = {
  eyebrow: 'Soutenir le projet',
  title: 'Aidez QuizOnline a grandir',
  lead: 'QuizOnline est un projet open-source gratuit. Votre soutien permet de maintenir la plateforme, corriger les bugs et developper de nouvelles fonctionnalites.',
  whyTitle: 'Pourquoi soutenir QuizOnline ?',
  reasons: [
    {
      icon: 'pi pi-code',
      title: 'Open-source et gratuit',
      description: 'Pas d\'abonnement, pas de publicite. Le code est libre et le restera.',
    },
    {
      icon: 'pi pi-server',
      title: 'Hebergement et infrastructure',
      description: 'Les serveurs, les certificats SSL et la livraison des emails ont un cout reel.',
    },
    {
      icon: 'pi pi-wrench',
      title: 'Maintenance continue',
      description: 'Mises a jour de securite, corrections de bugs et compatibilite avec les nouvelles versions.',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'Nouvelles fonctionnalites',
      description: 'Chaque contribution accelere le developpement de fonctionnalites demandees par la communaute.',
    },
  ],
  ctaTitle: 'Faire un don',
  ctaDescription: 'Les dons sont geres via GitHub Sponsors. Vous pouvez faire un don ponctuel ou mettre en place un soutien recurrent.',
  ctaButton: 'Soutenir sur GitHub Sponsors',
  ctaNote: 'Vous serez redirige vers GitHub Sponsors dans un nouvel onglet.',
  thanksTitle: 'Merci !',
  thanksDescription: 'Chaque contribution, meme modeste, fait la difference. Merci de croire en ce projet.',
};

const EN: DonateUiText = {
  eyebrow: 'Support the project',
  title: 'Help QuizOnline grow',
  lead: 'QuizOnline is a free open-source project. Your support helps maintain the platform, fix bugs and develop new features.',
  whyTitle: 'Why support QuizOnline?',
  reasons: [
    {
      icon: 'pi pi-code',
      title: 'Open-source and free',
      description: 'No subscription, no ads. The code is free and will remain so.',
    },
    {
      icon: 'pi pi-server',
      title: 'Hosting and infrastructure',
      description: 'Servers, SSL certificates and email delivery have a real cost.',
    },
    {
      icon: 'pi pi-wrench',
      title: 'Ongoing maintenance',
      description: 'Security updates, bug fixes and compatibility with new releases.',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'New features',
      description: 'Every contribution accelerates the development of community-requested features.',
    },
  ],
  ctaTitle: 'Make a donation',
  ctaDescription: 'Donations are handled through GitHub Sponsors. You can make a one-time donation or set up recurring support.',
  ctaButton: 'Support on GitHub Sponsors',
  ctaNote: 'You will be redirected to GitHub Sponsors in a new tab.',
  thanksTitle: 'Thank you!',
  thanksDescription: 'Every contribution, however small, makes a difference. Thank you for believing in this project.',
};

const NL: DonateUiText = {
  eyebrow: 'Steun het project',
  title: 'Help QuizOnline groeien',
  lead: 'QuizOnline is een gratis open-source project. Uw steun helpt het platform te onderhouden, bugs te verhelpen en nieuwe functies te ontwikkelen.',
  whyTitle: 'Waarom QuizOnline steunen?',
  reasons: [
    {
      icon: 'pi pi-code',
      title: 'Open-source en gratis',
      description: 'Geen abonnement, geen advertenties. De code is vrij en blijft dat.',
    },
    {
      icon: 'pi pi-server',
      title: 'Hosting en infrastructuur',
      description: 'Servers, SSL-certificaten en e-mailbezorging brengen reele kosten mee.',
    },
    {
      icon: 'pi pi-wrench',
      title: 'Doorlopend onderhoud',
      description: 'Beveiligingsupdates, bugfixes en compatibiliteit met nieuwe versies.',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'Nieuwe functies',
      description: 'Elke bijdrage versnelt de ontwikkeling van door de community gevraagde functies.',
    },
  ],
  ctaTitle: 'Een donatie doen',
  ctaDescription: 'Donaties worden beheerd via GitHub Sponsors. U kunt eenmalig doneren of terugkerende steun instellen.',
  ctaButton: 'Steunen via GitHub Sponsors',
  ctaNote: 'U wordt doorgestuurd naar GitHub Sponsors in een nieuw tabblad.',
  thanksTitle: 'Bedankt!',
  thanksDescription: 'Elke bijdrage, hoe klein ook, maakt een verschil. Bedankt voor uw vertrouwen in dit project.',
};

const IT: DonateUiText = {
  eyebrow: 'Sostieni il progetto',
  title: 'Aiuta QuizOnline a crescere',
  lead: 'QuizOnline e un progetto open-source gratuito. Il tuo supporto aiuta a mantenere la piattaforma, correggere bug e sviluppare nuove funzionalita.',
  whyTitle: 'Perche sostenere QuizOnline?',
  reasons: [
    {
      icon: 'pi pi-code',
      title: 'Open-source e gratuito',
      description: 'Nessun abbonamento, nessuna pubblicita. Il codice e libero e lo restera.',
    },
    {
      icon: 'pi pi-server',
      title: 'Hosting e infrastruttura',
      description: 'Server, certificati SSL e consegna email hanno un costo reale.',
    },
    {
      icon: 'pi pi-wrench',
      title: 'Manutenzione continua',
      description: 'Aggiornamenti di sicurezza, correzioni di bug e compatibilita con le nuove versioni.',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'Nuove funzionalita',
      description: 'Ogni contributo accelera lo sviluppo delle funzionalita richieste dalla community.',
    },
  ],
  ctaTitle: 'Fai una donazione',
  ctaDescription: 'Le donazioni sono gestite tramite GitHub Sponsors. Puoi fare una donazione una tantum o impostare un supporto ricorrente.',
  ctaButton: 'Sostieni su GitHub Sponsors',
  ctaNote: 'Verrai reindirizzato a GitHub Sponsors in una nuova scheda.',
  thanksTitle: 'Grazie!',
  thanksDescription: 'Ogni contributo, anche piccolo, fa la differenza. Grazie per credere in questo progetto.',
};

const ES: DonateUiText = {
  eyebrow: 'Apoya el proyecto',
  title: 'Ayuda a QuizOnline a crecer',
  lead: 'QuizOnline es un proyecto open-source gratuito. Tu apoyo ayuda a mantener la plataforma, corregir errores y desarrollar nuevas funcionalidades.',
  whyTitle: 'Por que apoyar QuizOnline?',
  reasons: [
    {
      icon: 'pi pi-code',
      title: 'Open-source y gratuito',
      description: 'Sin suscripcion, sin publicidad. El codigo es libre y lo seguira siendo.',
    },
    {
      icon: 'pi pi-server',
      title: 'Alojamiento e infraestructura',
      description: 'Los servidores, certificados SSL y el envio de emails tienen un coste real.',
    },
    {
      icon: 'pi pi-wrench',
      title: 'Mantenimiento continuo',
      description: 'Actualizaciones de seguridad, correccion de errores y compatibilidad con nuevas versiones.',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'Nuevas funcionalidades',
      description: 'Cada contribucion acelera el desarrollo de funcionalidades solicitadas por la comunidad.',
    },
  ],
  ctaTitle: 'Hacer una donacion',
  ctaDescription: 'Las donaciones se gestionan a traves de GitHub Sponsors. Puedes hacer una donacion puntual o configurar un apoyo recurrente.',
  ctaButton: 'Apoyar en GitHub Sponsors',
  ctaNote: 'Seras redirigido a GitHub Sponsors en una nueva pestana.',
  thanksTitle: 'Gracias!',
  thanksDescription: 'Cada contribucion, por pequena que sea, marca la diferencia. Gracias por creer en este proyecto.',
};

const UI_TEXT: Partial<Record<LanguageEnumDto, DonateUiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getDonateUiText(lang: LanguageEnumDto | string | null | undefined): DonateUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? EN;
}
