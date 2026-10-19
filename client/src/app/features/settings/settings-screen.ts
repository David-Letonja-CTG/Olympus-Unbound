import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreditsDialog } from '../../shared/credits-dialog';
import { SettingsControls } from '../../shared/settings-controls';

@Component({
  selector: 'app-settings-screen',
  imports: [RouterLink, SettingsControls, CreditsDialog],
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
            <dd>Space · A / Cross or right trigger</dd>
          </div>
          <div>
            <dt>Sprint</dt>
            <dd>hold Shift · hold left bumper / trigger</dd>
          </div>
          <div>
            <dt>Dash</dt>
            <dd>E · B / Circle</dd>
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
      <div class="actions">
        <app-credits-dialog />
        <a class="btn" routerLink="/">Back</a>
      </div>
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
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `,
})
export class SettingsScreen {}
