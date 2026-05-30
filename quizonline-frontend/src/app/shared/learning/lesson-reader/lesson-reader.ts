import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../i18n/ui-text.service';
import {BLOCK_ICONS} from '../block-icons';
import {BlockCard} from '../block-card/block-card';
import {ContentBlock} from '../content-block.types';
import {getLearningCommonUiText} from '../learning-common.i18n';
import {pickTranslation} from '../learning-translations';

import {getLessonReaderUiText} from './lesson-reader.i18n';

interface BlockOutlineItem {
  id: number;
  label: string;
  icon: string;
  anchor: string;
}

/**
 * Shared "lesson reader" surface used by both the learner-facing
 * lesson view (``/lesson/{id}``) and the author preview mode of
 * ``/lesson/{id}/edit``. Owns the left-side block outline, the
 * vertical stack of block cards, and (optionally) the scroll-spy
 * that highlights the active entry in the outline as the learner
 * scrolls.
 *
 * Anchor scheme — single source of truth: every entry in the outline
 * targets ``#block-{id}``, matching the ``[id]`` that
 * :class:`BlockCard` sets on its host article. Extracting both halves
 * here removes the previous drift where lesson-edit had a composite
 * ``block-lesson-{lessonId}-{blockId}`` scheme that didn't match the
 * simple ``block-{blockId}`` ids the cards rendered with — the
 * outline links silently no-op'd in preview mode.
 *
 * Inputs:
 *
 * - ``blocks`` — ordered content blocks to render.
 * - ``scrollSpy`` (default ``false``) — when ``true``, register an
 *   ``IntersectionObserver`` against the rendered cards and highlight
 *   the most-visible one in the outline. Learner page only — the
 *   author preview leaves this off because the user is reviewing,
 *   not reading.
 */
@Component({
  selector: 'app-lesson-reader',
  imports: [BlockCard],
  templateUrl: './lesson-reader.html',
  styleUrl: './lesson-reader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonReader implements OnDestroy {
  private readonly hostElement: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly userService = inject(UserService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getLessonReaderUiText);
  protected readonly common = this.uiSvc.localized(getLearningCommonUiText);
  protected readonly currentLang = this.userService.lang;

  readonly blocks = input.required<ContentBlock[]>();
  readonly scrollSpy = input<boolean>(false);

  protected readonly activeAnchor = signal<string | null>(null);
  private observer: IntersectionObserver | null = null;

  /** One outline entry per block. Label prefers the block's own
   *  translated ``title``; falls back to the localised block-type
   *  name (e.g. "Texte enrichi"). Anchor matches ``BlockCard``'s
   *  ``[id]="'block-' + block.id"`` exactly — never compose. */
  protected readonly outline = computed<BlockOutlineItem[]>(() => {
    const labels = this.common().blockTypeLabels;
    const lang = this.currentLang();
    return this.blocks().map((b) => {
      const customTitle = pickTranslation(b.translations, lang, 'title')?.trim();
      return {
        id: b.id,
        label: customTitle || labels[b.block_type] || b.block_type,
        icon: BLOCK_ICONS[b.block_type] ?? 'pi pi-file',
        anchor: `block-${b.id}`,
      };
    });
  });

  constructor() {
    // Re-wire the IntersectionObserver whenever the rendered block list
    // changes (a new lesson loads, or the user reaches the page on
    // first paint with the blocks already cached). Cheap when
    // scrollSpy is off — the early-return below skips the DOM walk.
    effect(() => {
      this.blocks();
      this.scrollSpy();
      queueMicrotask(() => this.rewireScrollSpy());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /** Absolute href that produces ``/<current path>#block-X``. Without
   *  the path prefix, ``<base href="/">`` collapses bare ``#anchor``
   *  hrefs to ``/#anchor`` — and the Router then teleports the user
   *  to the home route. */
  protected anchorHref(anchor: string): string {
    return `${location.pathname}${location.search}#${anchor}`;
  }

  /** Smooth-scroll to a block by anchor. The plain ``<a href="#x">``
   *  navigation is intercepted by the Router (see ``anchorHref``);
   *  handling the click manually keeps the navigation SPA-local and
   *  gives us smooth scrolling for free. */
  protected scrollToBlock(event: MouseEvent, anchor: string): void {
    event.preventDefault();
    const target = document.getElementById(anchor);
    if (!target) {
      return;
    }
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
    history.replaceState(history.state, '', this.anchorHref(anchor));
  }

  /** Tear down the previous observer and register a fresh one against
   *  the currently-rendered block cards. Called by an effect whenever
   *  ``blocks`` or ``scrollSpy`` changes. No-op when ``scrollSpy`` is
   *  off so the author preview pays nothing for it. */
  private rewireScrollSpy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.activeAnchor.set(null);
    if (!this.scrollSpy()) {
      return;
    }
    const cards = this.hostElement.nativeElement.querySelectorAll<HTMLElement>('.block-card');
    if (cards.length === 0) {
      return;
    }
    const visibility = new Map<string, number>();
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = entry.target.id;
            if (!id) {
              continue;
            }
            visibility.set(id, entry.intersectionRatio);
          }
          // Pick the most-visible card; ties resolve by document order
          // since ``IntersectionObserver`` keeps insertion order.
          let bestId: string | null = null;
          let bestRatio = 0;
          for (const [id, ratio] of visibility) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          }
          if (bestId !== this.activeAnchor()) {
            this.zone.run(() => this.activeAnchor.set(bestId));
          }
        },
        {threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-30% 0px -40% 0px'},
      );
      cards.forEach((c: HTMLElement) => this.observer!.observe(c));
    });
  }
}
