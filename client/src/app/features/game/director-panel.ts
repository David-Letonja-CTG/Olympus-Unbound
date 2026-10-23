import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DirectorReport } from '../../../engine';

/**
 * What the Director of Chaos knows, for development (spec: director-of-chaos / debugging): shown over a debug run opened
 * with `?debug&director`, refreshed twice a second from the session's `inspect()`. It only reads the report.
 */
@Component({
  selector: 'app-director-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = report();
    <h2>Director of Chaos {{ r.enabled ? '' : '(off)' }}</h2>
    <p>
      <b>{{ r.mood }}</b> · pressure {{ fixed(r.pressure) }}
      @if (r.recoveryLeft > 0) {
        · recovery {{ round(r.recoveryLeft) }} s
      }
    </p>
    <p class="factors">
      threat {{ fixed(r.factors.threat) }} · damage {{ fixed(r.factors.damage) }} · health
      {{ fixed(r.factors.health) }} · boss {{ r.factors.boss }} · encounters
      {{ fixed(r.factors.encounters) }}
    </p>
    <p>
      kills/s {{ fixed(r.killRate) }} · {{ r.dominant ? 'dominant' : '' }}
      {{ r.struggling ? 'struggling' : '' }} {{ r.still ? 'still' : '' }} · adapt in
      {{ round(r.adaptIn) }} s
    </p>
    <p>
      corruption {{ r.realm.corruption }} · grudge {{ r.realm.grudge }} · elites slain
      {{ r.realm.elitesSlain }} · {{ r.stream }}
    </p>
    <h3>Under way</h3>
    <ul>
      @for (a of r.active; track a.uid) {
        <li>{{ a.id }} · {{ a.phase }} · {{ round(a.seconds) }} s {{ a.outcome ?? '' }}</li>
      } @empty {
        <li>—</li>
      }
    </ul>
    <h3>Encounters</h3>
    <ul>
      @for (e of r.encounters; track e.id) {
        <li [class.ready]="!e.reason">
          {{ e.id }}: {{ e.reason ?? 'eligible' }}
          @if (e.cooldown > 0) {
            ({{ round(e.cooldown) }} s)
          }
          · {{ e.thisRealm }} here
        </li>
      }
    </ul>
    <h3>Decisions</h3>
    <ul>
      @for (d of decisions(); track $index) {
        <li>
          {{ round(d.time) }} s {{ d.id }} of {{ d.candidates }} at {{ fixed(d.pressure) }}
          {{ d.because.join(', ') }}
        </li>
      }
    </ul>
    <h3>Outcomes</h3>
    <ul>
      @for (o of outcomes(); track $index) {
        <li>{{ round(o.time) }} s {{ o.id }} · {{ o.phase }} {{ o.outcome ?? '' }}</li>
      }
    </ul>
  `,
  styles: `
    :host {
      position: absolute;
      bottom: 150px;
      right: 12px;
      width: 330px;
      max-height: 45%;
      overflow: auto;
      padding: 8px 10px;
      font:
        11px/1.35 ui-monospace,
        monospace;
      color: #e8e0ff;
      background: rgba(10, 6, 20, 0.82);
      border: 1px solid #5a3a8a;
      pointer-events: none;
      z-index: 5;
    }
    h2,
    h3 {
      margin: 6px 0 2px;
      font-size: 12px;
      color: #d9b8ff;
    }
    p,
    ul {
      margin: 0 0 2px;
      padding: 0;
      list-style: none;
    }
    .factors {
      color: #b8a8d8;
    }
    .ready {
      color: #a8f0b0;
    }
  `,
})
export class DirectorPanel {
  readonly report = input.required<DirectorReport>();
  protected readonly decisions = computed(() => [...this.report().decisions].reverse());
  protected readonly outcomes = computed(() => [...this.report().outcomes].reverse());

  protected fixed(n: number): string {
    return n.toFixed(2);
  }

  protected round(n: number): number {
    return Math.round(n);
  }
}
