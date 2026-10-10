import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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
      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    .panel {
      width: min(480px, 100%);
      padding: 20px 24px;
    }
    h2 {
      font-size: 1.1rem;
      color: var(--gold);
      margin-bottom: 8px;
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
  `,
})
export class SettingsScreen {}
