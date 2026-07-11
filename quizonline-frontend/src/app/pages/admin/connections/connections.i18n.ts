import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import data from './connections.i18n.json';

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

const CATALOG = data as Record<string, ConnectionsUiText>;

export function getConnectionsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): ConnectionsUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
