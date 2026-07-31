import {expect, vi, beforeEach} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {TranslocoTestingModule} from '@jsverse/transloco';
import {MessageService} from 'primeng/api';

// Suffixe `Catalog` obligatoire : un `import it from ...` masquerait la
// fonction de test it() du runner.
import enCatalog from '../public/i18n/en.json';
import esCatalog from '../public/i18n/es.json';
import frCatalog from '../public/i18n/fr.json';
import itCatalog from '../public/i18n/it.json';
import nlCatalog from '../public/i18n/nl.json';
import {RootCatalog, registerCatalogs} from './app/shared/i18n/catalog-registry';

// En production les catalogues arrivent par HTTP et sont enregistres dans un
// APP_INITIALIZER. Un TestBed n'a pas de bootstrap : sans cet appel, le premier
// getter i18n leverait dans chaque spec. On importe les MEMES fichiers que ceux
// servis en production, pas des fixtures qui deriveraient.

type VitestSpy = ReturnType<typeof vi.fn> & {
  and: {
    returnValue: (value: unknown) => VitestSpy;
    callFake: (implementation: (...args: unknown[]) => unknown) => VitestSpy;
  };
};

type SpyObject<T> = {
  [K in keyof T]: T[K];
};

type JasmineSpyFactory = {
  createSpy: (name?: string) => VitestSpy;
  createSpyObj: <T>(
    baseName: string,
    methodNames: ReadonlyArray<keyof T | string>,
  ) => SpyObject<T>;
};

function createSpy(): VitestSpy {
  const spy = vi.fn() as VitestSpy;
  spy.and = {
    returnValue(value: unknown) {
      spy.mockReturnValue(value);
      return spy;
    },
    callFake(implementation: (...args: unknown[]) => unknown) {
      spy.mockImplementation(implementation);
      return spy;
    },
  };

  return spy;
}

const jasmineCompat: JasmineSpyFactory = {
  createSpy: () => createSpy(),
  createSpyObj: <T>(_: string, methodNames: ReadonlyArray<keyof T | string>) => {
    const spyObject: Record<string, VitestSpy> = {};

    for (const methodName of methodNames) {
      spyObject[String(methodName)] = createSpy();
    }

    return spyObject as SpyObject<T>;
  },
};

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.assign(globalThis, {
  jasmine: jasmineCompat,
  ResizeObserver: ResizeObserverMock,
});

window.__APP__ ??= {
  name: 'QuizOnline',
  version: 'test',
  author: 'test',
  year: '2026',
  logoSvg: '',
  logoIco: '',
  logoPng: '',
};

// Provide the Transloco engine (loader + TRANSLOCO_TRANSPILER) to every
// component test, pinned to the bundled ``en`` catalog. The app renders text
// through the ``UiTextService`` façade; this is the fleet-standard conformance
// wiring so any ``| transloco`` usage and Transloco injectables resolve in specs.
beforeEach(() => {
  // Dans le beforeEach et non au niveau module : sous le runner navigateur,
  // l'ordre d'evaluation des modules ne garantit pas que le registre soit
  // rempli avant que les specs ne l'interrogent.
  registerCatalogs({
    fr: frCatalog as unknown as RootCatalog,
    en: enCatalog as unknown as RootCatalog,
    nl: nlCatalog as unknown as RootCatalog,
    it: itCatalog as unknown as RootCatalog,
    es: esCatalog as unknown as RootCatalog,
  });
  localStorage.setItem('lang', 'en');
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: {en: enCatalog as never},
        translocoConfig: {availableLangs: ['en'], defaultLang: 'en'},
        preloadLangs: true,
      }),
    ],
    // AppToastService dépend désormais du MessageService PrimeNG (migration
    // vers <p-toast>) ; fourni globalement pour que tout spec l'injectant résolve.
    providers: [MessageService],
  });
});

expect.extend({
  toBeTrue(received: unknown) {
    return {
      pass: received === true,
      message: () => `expected ${String(received)} to be true`,
    };
  },
  toBeFalse(received: unknown) {
    return {
      pass: received === false,
      message: () => `expected ${String(received)} to be false`,
    };
  },
  toHaveBeenCalledOnceWith(received: unknown, ...expected: unknown[]) {
    if (!vi.isMockFunction(received)) {
      return {
        pass: false,
        message: () => 'expected a mock or spy function',
      };
    }

    const calls = received.mock.calls;
    const pass = calls.length === 1 && this.equals(calls[0], expected);

    return {
      pass,
      message: () =>
        `expected spy to be called once with ${this.utils.printExpected(expected)}, ` +
        `but received ${this.utils.printReceived(calls)}`,
    };
  },
});
