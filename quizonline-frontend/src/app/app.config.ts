import {APP_INITIALIZER, ApplicationConfig, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withFetch, withInterceptors,} from '@angular/common/http';
import {provideTransloco} from '@jsverse/transloco';
import {routes} from './app.routes';
import {providePrimeNG} from 'primeng/config';
import {MessageService} from 'primeng/api';
import {definePreset} from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import {AuthInterceptor} from './auth-interceptor';
import {NetworkInterceptor} from './network-interceptor';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {Configuration} from './api/generated/configuration';
import {resolveApiBaseUrl} from './shared/api/runtime-api-base-url';
import {PrimeNGTranslationService} from './shared/i18n/primeng-translation.service';
import {BundledTranslocoLoader} from './core/i18n/transloco-loader';
import {TranslocoLangSync} from './core/i18n/transloco-lang-sync.service';

// Emerald is the single fleet accent (STANDARD-frontend-layout.md §9). Remap BOTH
// the `primary` semantic AND the `green` primitive onto Emerald so that
// `severity="success"` renders in the exact same emerald as `primary` — otherwise
// `success` falls back to PrimeNG's default green and the UI shows two greens.
const EMERALD_SCALE = {
  50: '{emerald.50}',
  100: '{emerald.100}',
  200: '{emerald.200}',
  300: '{emerald.300}',
  400: '{emerald.400}',
  500: '{emerald.500}',
  600: '{emerald.600}',
  700: '{emerald.700}',
  800: '{emerald.800}',
  900: '{emerald.900}',
  950: '{emerald.950}',
} as const;

const QuizOnlineAura = definePreset(Aura, {
  primitive: {green: {...EMERALD_SCALE}},
  semantic: {primary: {...EMERALD_SCALE}},
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([AuthInterceptor, NetworkInterceptor,]),
    ),
    {
      provide: Configuration,
      useFactory: () =>
        new Configuration({basePath: resolveApiBaseUrl()}),
    },
    provideAnimationsAsync('noop'),
    // MessageService alimente le <p-toast> unique (app.html) via AppToastService.
    MessageService,
    // 🔹 PrimeNG theme — emerald fleet accent + dark mode via `.dark-mode`
    //    (toggled on <html> by ThemeService / the anti-FOUC script).
    providePrimeNG({
      theme: {
        preset: QuizOnlineAura,
        options: {
          darkModeSelector: '.dark-mode',
          cssLayer: false,
        },
      },
    }),
    // Transloco engine (fleet convention). Text is rendered through the typed
    // ``UiTextService`` façade; Transloco is wired for conformance + tests. The
    // bundled loader serves in-memory catalogs (no HTTP).
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr', 'nl', 'it', 'es'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: BundledTranslocoLoader,
    }),
    // Instantiate the PrimeNG translation bridge eagerly so paginator,
    // calendar, multiselect, etc. render in the user's chosen language
    // from the very first frame, not after a navigation.
    {
      provide: APP_INITIALIZER,
      useFactory: (service: PrimeNGTranslationService) => () => service,
      deps: [PrimeNGTranslationService],
      multi: true,
    },
    // Mirror the app language authority (UserService.lang) into Transloco.
    {
      provide: APP_INITIALIZER,
      useFactory: (sync: TranslocoLangSync) => () => sync,
      deps: [TranslocoLangSync],
      multi: true,
    },
  ],
};
