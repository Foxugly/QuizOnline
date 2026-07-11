import {APP_INITIALIZER, ApplicationConfig, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withFetch, withInterceptors,} from '@angular/common/http';
import {provideTransloco} from '@jsverse/transloco';
import {routes} from './app.routes';
import {providePrimeNG} from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {AuthInterceptor} from './auth-interceptor';
import {NetworkInterceptor} from './network-interceptor';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {Configuration} from './api/generated/configuration';
import {resolveApiBaseUrl} from './shared/api/runtime-api-base-url';
import {PrimeNGTranslationService} from './shared/i18n/primeng-translation.service';
import {BundledTranslocoLoader} from './core/i18n/transloco-loader';
import {TranslocoLangSync} from './core/i18n/transloco-lang-sync.service';

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
    // 🔹 Configuration du thème PrimeNG
    providePrimeNG({
      theme: {
        preset: Aura, //AuraLight
      }
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
