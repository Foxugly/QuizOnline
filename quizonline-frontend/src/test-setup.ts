import {expect, vi, beforeEach} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {TranslocoTestingModule} from '@jsverse/transloco';

import {CATALOGS} from './app/core/i18n/catalogs';

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
  localStorage.setItem('lang', 'en');
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: {en: CATALOGS.en},
        translocoConfig: {availableLangs: ['en'], defaultLang: 'en'},
        preloadLangs: true,
      }),
    ],
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
