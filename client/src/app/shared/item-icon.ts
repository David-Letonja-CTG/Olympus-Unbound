import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { spriteDataUrl } from '../../engine';

/** An item, god or enemy picture drawn by the engine's placeholder art. Decorative unless given a label. */
@Component({
  selector: 'app-item-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (url()) {
      <img [src]="url()" [alt]="label()" [width]="size()" [height]="size()" draggable="false" />
    } @else {
      <span
        class="fallback"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [attr.aria-label]="label() || null"
      ></span>
    }`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    img {
      image-rendering: auto;
    }
    .fallback {
      display: inline-block;
      border-radius: 6px;
      background: var(--panel-2);
    }
  `,
})
export class ItemIcon {
  readonly sprite = input.required<string>();
  readonly size = input(40);
  readonly label = input('');
  protected readonly url = computed(() =>
    spriteDataUrl(this.sprite(), Math.round(this.size() * 2)),
  );
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
