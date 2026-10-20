import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GRAPHICS_QUALITIES, GraphicsQuality } from '../../engine';
import { Progression } from '../core/progression';

const QUALITY_LABEL: Record<GraphicsQuality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Sound, screen shake, damage numbers and graphics quality; used by the settings screen and the pause menu. */
@Component({
  selector: 'app-settings-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = progression.settings();
    <div class="row">
      <label for="sfx">Sound effects</label>
      <input
        id="sfx"
        type="range"
        min="0"
        max="100"
        step="5"
        data-testid="sfx-volume"
        [value]="round(s.sfxVolume * 100)"
        (input)="progression.updateSettings({ sfxVolume: $any($event.target).valueAsNumber / 100 })"
      />
      <span class="value">{{ round(s.sfxVolume * 100) }}%</span>
    </div>
    <div class="row">
      <label for="music">Music</label>
      <input
        id="music"
        type="range"
        min="0"
        max="100"
        step="5"
        data-testid="music-volume"
        [value]="round(s.musicVolume * 100)"
        (input)="
          progression.updateSettings({ musicVolume: $any($event.target).valueAsNumber / 100 })
        "
      />
      <span class="value">{{ round(s.musicVolume * 100) }}%</span>
    </div>
    <div class="row">
      <label for="shake">Screen shake</label>
      <input
        id="shake"
        type="checkbox"
        data-testid="screen-shake"
        [checked]="s.screenShake"
        (change)="progression.updateSettings({ screenShake: $any($event.target).checked })"
      />
    </div>
    <div class="row">
      <label for="numbers">Damage numbers</label>
      <input
        id="numbers"
        type="checkbox"
        data-testid="damage-numbers"
        [checked]="s.damageNumbers"
        (change)="progression.updateSettings({ damageNumbers: $any($event.target).checked })"
      />
    </div>
    <div class="row">
      <label for="enemy-bars">Enemy health bars</label>
      <input
        id="enemy-bars"
        type="checkbox"
        data-testid="enemy-health-bars"
        [checked]="s.enemyHealthBars"
        (change)="progression.updateSettings({ enemyHealthBars: $any($event.target).checked })"
      />
    </div>
    <div class="row quality">
      <span id="quality-label">Graphics</span>
      <div class="segments" role="radiogroup" aria-labelledby="quality-label">
        @for (q of qualities; track q) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="s.quality === q"
            [class.on]="s.quality === q"
            [attr.data-testid]="'quality-' + q"
            (click)="progression.updateSettings({ quality: q })"
          >
            {{ label[q] }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 12px;
    }
    input[type='range'] {
      width: 160px;
      accent-color: var(--gold);
    }
    input[type='checkbox'] {
      width: 22px;
      height: 22px;
      accent-color: var(--gold);
      grid-column: 2 / 4;
      justify-self: end;
    }
    .value {
      width: 3.5em;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
    }
    .segments {
      grid-column: 2 / 4;
      display: flex;
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
    }
    .segments button {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 6px 12px;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
    }
    .segments button + button {
      border-left: 1px solid var(--line);
    }
    .segments button.on {
      background: var(--accent-bg);
      color: var(--gold-2);
    }
  `,
})
export class SettingsControls {
  protected readonly progression = inject(Progression);
  protected readonly qualities = GRAPHICS_QUALITIES;
  protected readonly label = QUALITY_LABEL;

  protected round(n: number): number {
    return Math.round(n);
  }
}
