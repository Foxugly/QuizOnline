import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';

@Component({
  selector: 'app-question-button',
  imports: [CommonModule, ButtonModule],
  templateUrl: './question-button.html',
  styleUrl: './question-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionButton {
  /** Texte du bouton */
  readonly label = input('');

  /** Couleur de fond */
  readonly backgroundColor = input<string | undefined>(undefined);

  /** Couleur de bordure */
  readonly borderColor = input<string | undefined>(undefined);

  /** Largeur de bordure (ex: '1px', '3px') */
  readonly borderWidth = input<string | undefined>(undefined);

  /** Rayon des coins (optionnel) */
  readonly borderRadius = input<string | undefined>(undefined);

  /** Couleur du texte (optionnel) */
  readonly textColor = input<string | undefined>(undefined);

  /** Bouton désactivé */
  readonly disabled = input(false);

  /** Événement clic */
  readonly clicked = output<MouseEvent>();

  onClick(event: MouseEvent) {
    this.clicked.emit(event);
  }

  get styleObject(): Record<string, string> {
    const style: Record<string, string> = {};

    if (this.backgroundColor()) {
      style['background'] = this.backgroundColor()!;
    }

    if (this.borderColor()) {
      style['border-color'] = this.borderColor()!;
      style['border-style'] = 'solid';
    }

    if (this.borderWidth()) {
      style['border-width'] = this.borderWidth()!;
      style['border-style'] = 'solid';
    }

    if (this.borderRadius()) {
      style['border-radius'] = this.borderRadius()!;
    }

    if (this.textColor()) {
      style['color'] = this.textColor()!;
    }

    return style;
  }
}
