import { ChangeDetectionStrategy, Component } from '@angular/core';
import { spriteKeys } from '../../../engine';
import { ItemIcon } from '../../shared/item-icon';

/** Development-only page (`/dev/art`): every code-drawn sprite, large, for reviewing art against the direction. */
@Component({
  selector: 'app-art-gallery',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="gallery">
      @for (key of keys; track key) {
        <figure>
          <app-item-icon [sprite]="key" [size]="112" [label]="key" />
          <figcaption>{{ key }}</figcaption>
        </figure>
      }
    </main>
  `,
  styles: `
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 12px;
      padding: 16px;
      background: #2a2d36;
      min-height: 100vh;
    }
    figure {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: radial-gradient(circle, #4a4f5c, #23252c);
      border-radius: 8px;
      padding: 8px;
    }
    figcaption {
      font-size: 0.7rem;
      color: #c8c4bb;
    }
  `,
})
export class ArtGallery {
  protected readonly keys = spriteKeys();
}
