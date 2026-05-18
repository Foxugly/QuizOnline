import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ImageModule} from 'primeng/image';

import {UserService} from '../../../../services/user/user';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickTranslation} from '../../../../shared/lms/lms-translations';

/**
 * Renders the ``image`` ContentBlock via PrimeNG's ``<p-image>`` so the
 * card-clamped thumbnail can be expanded to a fullscreen preview with
 * built-in zoom / rotate / reset controls. The thumbnail itself is
 * width-clamped (max-width: 100%) so it never overflows the parent
 * block-card frame; the preview overlay is portaled to body so its
 * size is independent of the card.
 *
 * The lesson-view template only mounts this when
 * ``block_type === 'image'`` but we still guard on ``block.image``
 * because the field is nullable on the wire.
 */
@Component({
  selector: 'app-block-image',
  imports: [ImageModule],
  template: `
    @if (block().image; as src) {
      <p-image [src]="src" [alt]="alt()" [preview]="true" class="block-image" />
    }
  `,
  styles: [`
    :host { display: block; }
    .block-image ::ng-deep img {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 6px;
      cursor: zoom-in;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBlockRenderer {
  private readonly user = inject(UserService);

  readonly block = input.required<ContentBlock>();

  protected readonly alt = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title') || 'Image',
  );
}
