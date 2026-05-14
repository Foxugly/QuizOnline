import {provideZoneChangeDetection} from "@angular/core";
// src/main.ts
import {bootstrapApplication} from '@angular/platform-browser';
import {App} from './app/app';
import {appConfig} from './app/app.config';
import {initSentry} from './app/shared/monitoring/sentry-init';
import {environment} from './environments/environment';

// Initialise Sentry before bootstrapping so a crash in constructor /
// first render still reaches the reporter. No-op when no DSN is set.
initSentry();

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
