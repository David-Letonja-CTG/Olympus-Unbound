import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ATTRIBUTION_LICENCES, GameContent } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { SettingsControls } from '../../shared/settings-controls';

@Component({
  selector: 'app-settings-screen',
  imports: [RouterLink, SettingsControls],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Settings</h1>
      <section class="panel">
        <app-settings-controls />
      </section>
      <section class="panel controls">
        <h2>Controls</h2>
        <dl>
          <div>
            <dt>Move</dt>
            <dd>WASD / arrow keys · left stick / d-pad</dd>
          </div>
          <div>
            <dt>Divine ability</dt>
            <dd>Space or Shift · A / Cross</dd>
          </div>
          <div>
            <dt>Pause</dt>
            <dd>Esc or P · Start</dd>
          </div>
          <div>
            <dt>Choose upgrade</dt>
            <dd>1–3, arrows + Enter, mouse · d-pad + A</dd>
          </div>
        </dl>
      </section>
      <section class="panel credits" data-testid="credits">
        <h2>Credits</h2>
        <p>Design, code, art and sound are original to Olympus Unbound unless listed below.</p>
        @if (credits.length) {
          <ul>
            @for (c of credits; track c.id) {
              <li>
                <strong>{{ c.title }}</strong> by {{ c.author }} — {{ c.licence }}
                <a [href]="c.source" target="_blank" rel="noopener noreferrer">source</a>
                @if (c.notes) {
                  <span class="notes">({{ c.notes }})</span>
                }
              </li>
            }
          </ul>
        }
      </section>
      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    .panel {
      width: min(520px, 100%);
      padding: 14px 18px;
    }
    h2 {
      font-size: 1.05rem;
      color: var(--gold-2);
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    dl {
      margin: 0;
      display: grid;
      gap: 8px;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    dt {
      color: var(--muted);
    }
    dd {
      margin: 0;
      text-align: right;
    }
    .credits p,
    .credits li {
      color: var(--muted);
      font-size: 0.9rem;
      margin: 0 0 6px;
    }
    .credits ul {
      margin: 0;
      padding-left: 18px;
    }
    .credits a {
      color: var(--gold);
    }
    .notes {
      font-size: 0.8rem;
    }
  `,
})
export class SettingsScreen {
  private readonly content: GameContent = inject(GAME_CONTENT);
  /** External assets whose licences ask for credit (spec: asset-pipeline / licence registry). */
  protected readonly credits = this.content.assets.files
    .filter(
      (f) =>
        f.type === 'font' ||
        ATTRIBUTION_LICENCES.includes(f.licence.name) ||
        f.licence.name === 'OFL-1.1',
    )
    .map((f) => ({
      id: f.id,
      title: f.licence.title,
      author: f.licence.author,
      licence: f.licence.name,
      source: f.licence.source,
      notes: f.licence.notes,
    }));
}
