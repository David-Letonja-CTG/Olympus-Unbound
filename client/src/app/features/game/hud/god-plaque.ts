import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { HudPartyMember, HudSnapshot } from '../../../../engine';
import { ItemIcon } from '../../../shared/item-icon';
import { AbilitySlot, DashPip, HealthVessel, Loadout } from './hud-pieces';

/** Where a plaque sits: one half of the frieze, or a corner (spec: hud / local players on the hud). */
export type PlaquePlace = 'left' | 'right' | 'corner-0' | 'corner-1' | 'corner-2' | 'corner-3';

/**
 * One player's plaque on a shared screen: their orb of blood ringed with stamina, dash pip, name, loadout and ability with
 * its key. The right half of the frieze and the right corners mirror it, so the orb is always at the screen's edge.
 */
@Component({
  selector: 'app-god-plaque',
  imports: [AbilitySlot, DashPip, HealthVessel, Loadout],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './god-plaque.css',
  host: { '[class]': 'place()', '[style.--seat]': 'seat()' },
  template: `
    @let h = hud();
    <div
      class="god-plaque"
      [class.fallen]="fallen()"
      [attr.data-testid]="'plaque-' + index()"
      [attr.aria-label]="name()"
      role="group"
    >
      <div class="plaque-vessel">
        <app-health-vessel
          [health]="h.health"
          [maxHealth]="h.maxHealth"
          [stamina]="staminaShare()"
          [seat]="seat()"
          [fallen]="fallen()"
          [revive]="member()?.revive ?? 0"
          [label]="name()"
          [suffix]="suffix()"
        />
        <app-dash-pip [stamina]="h.stamina" [key]="keys().dash" [suffix]="suffix()" />
      </div>
      <div class="plaque-body">
        <span class="plaque-name"
          >{{ name() }}
          @if (h.surge > 0) {
            <span class="surge-tag" [attr.data-testid]="'hud-surge' + suffix()"
              >Surge {{ ceil(h.surge) }} s</span
            >
          }
        </span>
        <app-loadout
          [hud]="h"
          [size]="corner() ? 26 : 34"
          [smallSize]="corner() ? 18 : 26"
          [suffix]="suffix()"
        />
      </div>
      <app-ability-slot
        [ability]="h.ability"
        [key]="keys().ability"
        [size]="corner() ? 40 : 48"
        [suffix]="suffix()"
      />
    </div>
  `,
})
export class GodPlaque {
  readonly hud = input.required<HudSnapshot>();
  readonly place = input.required<PlaquePlace>();
  /** Seat index from 0. */
  readonly index = input.required<number>();
  readonly name = input.required<string>();
  readonly seat = input.required<string>();
  readonly keys = input.required<{ ability: string; dash: string }>();
  /** This player's own entry in the party (fallen, revive). */
  readonly member = input<HudPartyMember>();

  protected readonly corner = computed(() => this.place().startsWith('corner'));
  protected readonly suffix = computed(() => (this.index() === 0 ? '' : `-p${this.index() + 1}`));
  protected readonly fallen = computed(() => this.member()?.alive === false);
  protected readonly staminaShare = computed(() => {
    const { value, max } = this.hud().stamina;
    return max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  });

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}

/**
 * A god not played at this screen (spec: hud / party health): a coin portrait in the seat's colour, with a ring of
 * health, and for players an arc of stamina and a gem lit when the ability is ready. Grey while fallen, the ring then
 * showing the revive.
 */
@Component({
  selector: 'app-medallion',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './medallion.css',
  host: { '[style.--seat]': 'seat()' },
  template: `
    @let m = member();
    <div class="medallion" [class.fallen]="!m.alive" [attr.data-testid]="'medallion-' + m.seat">
      <div class="coin">
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle class="coin-track" cx="30" cy="30" r="27" />
          <circle
            class="coin-ring"
            cx="30"
            cy="30"
            r="27"
            pathLength="100"
            transform="rotate(-90 30 30)"
            [attr.stroke-dasharray]="ring() + ' 100'"
            [attr.data-testid]="'medallion-ring-' + m.seat"
            [attr.data-share]="round(ring())"
          />
          @if (!m.bot && m.alive) {
            <circle
              class="coin-stamina"
              cx="30"
              cy="30"
              r="22"
              pathLength="100"
              transform="rotate(-90 30 30)"
              [attr.stroke-dasharray]="m.stamina * 100 + ' 100'"
            />
          }
        </svg>
        <app-item-icon class="portrait" [sprite]="m.sprite" [size]="30" [label]="m.god" />
        @if (!m.bot && m.alive) {
          <span
            class="gem"
            [class.ready]="m.ability >= 1"
            [attr.data-testid]="'medallion-ability-' + m.seat"
            [attr.aria-label]="m.ability >= 1 ? 'Ability ready' : 'Ability recharging'"
          ></span>
        }
      </div>
      <span class="medal-text">
        <span class="medal-name">{{ m.name }}</span>
        <span class="medal-state">{{ state() }}</span>
      </span>
    </div>
  `,
})
export class Medallion {
  readonly member = input.required<HudPartyMember>();
  readonly seat = input.required<string>();

  /** The ring: health while alive, the revive while fallen (0–100). */
  protected readonly ring = computed(() => {
    const m = this.member();
    if (!m.alive) return Math.max(0, Math.min(100, m.revive * 100));
    return m.maxHealth > 0 ? Math.max(0, Math.min(100, (m.health / m.maxHealth) * 100)) : 0;
  });
  protected readonly state = computed(() => {
    const m = this.member();
    if (!m.alive) return 'Fallen · stand by their spirit';
    return `${m.health} / ${m.maxHealth}${m.bot ? ' · bot' : ''}`;
  });

  protected round(n: number): number {
    return Math.round(n);
  }
}
