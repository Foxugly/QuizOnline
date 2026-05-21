import {provideZoneChangeDetection} from "@angular/core";
// src/main.ts
import {bootstrapApplication} from '@angular/platform-browser';
import {App} from './app/app';
import {appConfig} from './app/app.config';
import {initSentry} from './app/shared/monitoring/sentry-init';
import {installPrimeNgAutofocusStripper} from './app/shared/platform/strip-primeng-autofocus';
import {environment} from './environments/environment';

// Kick off Sentry init in parallel with bootstrap — the SDK lives in a
// lazy chunk so the initial bundle stays small. Fire-and-forget: any
// network/DSN issue is logged to the console without blocking the app.
// No-op when no DSN is set.
void initSentry();

// Strip the stray ``autofocus="true"`` PrimeNG v21 renders on every
// ``<p-button>``. See the helper's docstring for the why; running it
// before ``bootstrapApplication`` arms the MutationObserver in time
// to catch the very first wave of component mounts.
installPrimeNgAutofocusStripper();

(window as any).__APP__ = {
  name: environment.appName,
  author: environment.author,
  year: environment.year,
  logoSvg : environment.logoSvg,
  logoIco : environment.logoIco,
  logoPng : environment.logoPng,
};

bootstrapApplication(App, {...appConfig, providers: [provideZoneChangeDetection(), ...appConfig.providers]})
  .catch(err => console.error(err));
