import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Progression } from '../core/progression';

/** Sound volume, screen shake and damage numbers; used by the settings screen and the pause menu. */
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
  `,
})
export class SettingsControls {
  protected readonly progression = inject(Progression);

  protected round(n: number): number {
    return Math.round(n);
  }
}
