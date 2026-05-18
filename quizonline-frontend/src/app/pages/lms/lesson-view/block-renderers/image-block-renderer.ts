import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UserService} from '../../../../services/user/user';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickTranslation} from '../../../../shared/lms/lms-translations';

/**
 * Renders the ``image`` ContentBlock — the lesson-view template only mounts
 * this component when ``block_type === 'image'``, but we still guard on
 * ``block.image`` because the field is nullable on the wire.
 */
@Component({
  selector: 'app-block-image',
  template: `
    @if (block().image; as src) {
      <img [src]="src" [alt]="alt()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBlockRenderer {
  private readonly user = inject(UserService);

  readonly block = input.required<ContentBlock>();

  protected readonly alt = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title') || 'Image',
  );
}
