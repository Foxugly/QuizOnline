import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripP',
})
export class StripPPipe implements PipeTransform {
  transform(html: string | null | undefined): string {
    if (!html) return '';
    return html
      .replace(/^<p>/i, '')
      .replace(/<\/p>$/i, '');
  }
}
