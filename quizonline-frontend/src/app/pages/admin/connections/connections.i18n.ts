import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface ConnectionsUiText {
  pageTitle: string;
  rangeLabel: string;
  rangePlaceholder: string;
  clearRange: string;
  /** Table column headers. */
  columns: {
    date: string;
    account: string;
    ip: string;
    location: string;
    device: string;
    actions: string;
  };
  detailsButton: string;
  emptyTitle: string;
  emptyHint: string;
  dialogTitle: string;
  /** Detail dialog field labels — one per ConnectionEvent field. */
  fields: {
    id: string;
    accountEmail: string;
    createdAt: string;
    loginMethod: string;
    ip: string;
    userAgent: string;
    browser: string;
    os: string;
    localTime: string;
    browserLanguage: string;
    timezone: string;
    screen: string;
    online: string;
    country: string;
    countryCode: string;
    city: string;
    region: string;
    latitude: string;
    longitude: string;
  };
  /** Rendered value for a boolean ``online`` flag. */
  yes: string;
  no: string;
  /** Placeholder rendered for an empty / null field value. */
  emptyValue: string;
  /** Leaflet map section. */
  map: {
    /** Heading above the map. */
    heading: string;
    /** Popup label prefixed before the city in a marker popup. */
    popupCity: string;
    /** Popup label prefixed before the date in a marker popup. */
    popupDate: string;
  };
}

export function getConnectionsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): ConnectionsUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Journal des connexions',
        rangeLabel: 'Période',
        rangePlaceholder: 'Sélectionnez une période',
        clearRange: 'Réinitialiser',
        columns: {
          date: 'Date',
          account: 'Compte',
          ip: 'Adresse IP',
          location: 'Localisation',
          device: 'Appareil',
          actions: 'Actions',
        },
        detailsButton: 'Détails',
        emptyTitle: 'Aucune connexion',
        emptyHint: 'Aucune connexion ne correspond à la période sélectionnée.',
        dialogTitle: 'Détails de la connexion',
        fields: {
          id: 'Identifiant',
          accountEmail: 'Compte',
          createdAt: 'Date',
          loginMethod: 'Méthode de connexion',
          ip: 'Adresse IP',
          userAgent: 'User-Agent',
          browser: 'Navigateur',
          os: "Système d'exploitation",
          localTime: 'Heure locale',
          browserLanguage: 'Langue du navigateur',
          timezone: 'Fuseau horaire',
          screen: 'Écran',
          online: 'En ligne',
          country: 'Pays',
          countryCode: 'Code pays',
          city: 'Ville',
          region: 'Région',
          latitude: 'Latitude',
          longitude: 'Longitude',
        },
        yes: 'Oui',
        no: 'Non',
        emptyValue: '—',
        map: {
          heading: 'Carte des connexions',
          popupCity: 'Ville',
          popupDate: 'Date',
        },
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Verbindingslogboek',
        rangeLabel: 'Periode',
        rangePlaceholder: 'Selecteer een periode',
        clearRange: 'Wissen',
        columns: {
          date: 'Datum',
          account: 'Account',
          ip: 'IP-adres',
          location: 'Locatie',
          device: 'Apparaat',
          actions: 'Acties',
        },
        detailsButton: 'Details',
        emptyTitle: 'Geen verbindingen',
        emptyHint: 'Geen verbinding komt overeen met de geselecteerde periode.',
        dialogTitle: 'Verbindingsdetails',
        fields: {
          id: 'Identificatie',
          accountEmail: 'Account',
          createdAt: 'Datum',
          loginMethod: 'Aanmeldmethode',
          ip: 'IP-adres',
          userAgent: 'User-Agent',
          browser: 'Browser',
          os: 'Besturingssysteem',
          localTime: 'Lokale tijd',
          browserLanguage: 'Browsertaal',
          timezone: 'Tijdzone',
          screen: 'Scherm',
          online: 'Online',
          country: 'Land',
          countryCode: 'Landcode',
          city: 'Stad',
          region: 'Regio',
          latitude: 'Breedtegraad',
          longitude: 'Lengtegraad',
        },
        yes: 'Ja',
        no: 'Nee',
        emptyValue: '—',
        map: {
          heading: 'Verbindingskaart',
          popupCity: 'Stad',
          popupDate: 'Datum',
        },
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Registro delle connessioni',
        rangeLabel: 'Periodo',
        rangePlaceholder: 'Seleziona un periodo',
        clearRange: 'Reimposta',
        columns: {
          date: 'Data',
          account: 'Account',
          ip: 'Indirizzo IP',
          location: 'Posizione',
          device: 'Dispositivo',
          actions: 'Azioni',
        },
        detailsButton: 'Dettagli',
        emptyTitle: 'Nessuna connessione',
        emptyHint: 'Nessuna connessione corrisponde al periodo selezionato.',
        dialogTitle: 'Dettagli della connessione',
        fields: {
          id: 'Identificativo',
          accountEmail: 'Account',
          createdAt: 'Data',
          loginMethod: 'Metodo di accesso',
          ip: 'Indirizzo IP',
          userAgent: 'User-Agent',
          browser: 'Browser',
          os: 'Sistema operativo',
          localTime: 'Ora locale',
          browserLanguage: 'Lingua del browser',
          timezone: 'Fuso orario',
          screen: 'Schermo',
          online: 'Online',
          country: 'Paese',
          countryCode: 'Codice paese',
          city: 'Città',
          region: 'Regione',
          latitude: 'Latitudine',
          longitude: 'Longitudine',
        },
        yes: 'Sì',
        no: 'No',
        emptyValue: '—',
        map: {
          heading: 'Mappa delle connessioni',
          popupCity: 'Città',
          popupDate: 'Data',
        },
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Registro de conexiones',
        rangeLabel: 'Periodo',
        rangePlaceholder: 'Seleccione un periodo',
        clearRange: 'Restablecer',
        columns: {
          date: 'Fecha',
          account: 'Cuenta',
          ip: 'Dirección IP',
          location: 'Ubicación',
          device: 'Dispositivo',
          actions: 'Acciones',
        },
        detailsButton: 'Detalles',
        emptyTitle: 'Sin conexiones',
        emptyHint: 'Ninguna conexión coincide con el periodo seleccionado.',
        dialogTitle: 'Detalles de la conexión',
        fields: {
          id: 'Identificador',
          accountEmail: 'Cuenta',
          createdAt: 'Fecha',
          loginMethod: 'Método de inicio de sesión',
          ip: 'Dirección IP',
          userAgent: 'User-Agent',
          browser: 'Navegador',
          os: 'Sistema operativo',
          localTime: 'Hora local',
          browserLanguage: 'Idioma del navegador',
          timezone: 'Zona horaria',
          screen: 'Pantalla',
          online: 'En línea',
          country: 'País',
          countryCode: 'Código de país',
          city: 'Ciudad',
          region: 'Región',
          latitude: 'Latitud',
          longitude: 'Longitud',
        },
        yes: 'Sí',
        no: 'No',
        emptyValue: '—',
        map: {
          heading: 'Mapa de conexiones',
          popupCity: 'Ciudad',
          popupDate: 'Fecha',
        },
      };
    default:
      return {
        pageTitle: 'Connection log',
        rangeLabel: 'Date range',
        rangePlaceholder: 'Select a date range',
        clearRange: 'Clear',
        columns: {
          date: 'Date',
          account: 'Account',
          ip: 'IP address',
          location: 'Location',
          device: 'Device',
          actions: 'Actions',
        },
        detailsButton: 'Details',
        emptyTitle: 'No connections',
        emptyHint: 'No connection matches the selected date range.',
        dialogTitle: 'Connection details',
        fields: {
          id: 'Identifier',
          accountEmail: 'Account',
          createdAt: 'Date',
          loginMethod: 'Login method',
          ip: 'IP address',
          userAgent: 'User agent',
          browser: 'Browser',
          os: 'Operating system',
          localTime: 'Local time',
          browserLanguage: 'Browser language',
          timezone: 'Timezone',
          screen: 'Screen',
          online: 'Online',
          country: 'Country',
          countryCode: 'Country code',
          city: 'City',
          region: 'Region',
          latitude: 'Latitude',
          longitude: 'Longitude',
        },
        yes: 'Yes',
        no: 'No',
        emptyValue: '—',
        map: {
          heading: 'Connections map',
          popupCity: 'City',
          popupDate: 'Date',
        },
      };
  }
}
