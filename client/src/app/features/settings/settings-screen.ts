import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progression } from '../../core/progression';
import { RoomService } from '../../core/rooms/room-service';
import { CreditsDialog } from '../../shared/credits-dialog';
import { SettingsControls } from '../../shared/settings-controls';

@Component({
  selector: 'app-settings-screen',
  imports: [RouterLink, SettingsControls, CreditsDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Settings</h1>
      <!-- The name friends see in rooms and on shared pictures (spec: meta-progression / save format version 9). -->
      <section class="panel">
        <label class="field">
          <span>Your name</span>
          <input
            data-testid="settings-name"
            maxlength="16"
            placeholder="Hero"
            [value]="progression.playerName()"
            (change)="rooms.rememberName($any($event.target).value)"
          />
        </label>
        <p class="hint">Shown to friends in co-op rooms and on the pictures you share.</p>
      </section>
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
      <div class="actions sticky">
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
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--muted);
    }
    .field input {
      font: inherit;
      color: var(--text);
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--line);
      padding: 8px 10px;
      min-height: 40px;
    }
    .hint {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `,
})
export class SettingsScreen {
  protected readonly progression = inject(Progression);
  protected readonly rooms = inject(RoomService);
}
