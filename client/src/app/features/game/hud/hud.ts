import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { ControlScheme, HudPartyMember, HudSnapshot, SEAT_COLORS } from '../../../../engine';
import { formatTime, ItemIcon } from '../../../shared/item-icon';
import { GodPlaque, Medallion, PlaquePlace } from './god-plaque';
import { AbilitySlot, DashPip, HealthVessel, keysFor, Loadout, StaminaVessel } from './hud-pieces';

export interface Announcement {
  readonly id: number;
  readonly text: string;
  readonly kind: 'elite' | 'boss' | 'synergy' | 'info';
}

/** How the players at this screen share it (spec: hud / local players on the hud). */
export type HudLayout = 'frieze' | 'duo' | 'corners';

/**
 * The run HUD (spec: hud). Updated from throttled snapshots, never per frame (D7). One player has the bronze frieze
 * along the bottom: orb of blood, loadout, experience, ability and orb of ichor. Two players at one screen split
 * the frieze; three or four each get a plaque in a corner. Gods not played here are medallions on the left. Nobody is
 * shown twice. The pieces have no styles of their own: this component's stylesheet (not encapsulated, every rule
 * under `app-hud`) styles them wherever they sit.
 */
@Component({
  selector: 'app-hud',
  imports: [
    ItemIcon,
    GodPlaque,
    Medallion,
    HealthVessel,
    StaminaVessel,
    DashPip,
    AbilitySlot,
    Loadout,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'layout()', '[class.touch]': 'touch()' },
  template: `
    @let h = hud();
    <div class="top">
      <div class="plaque">
        <span class="timer" data-testid="hud-time">{{ time() }}</span>
        <span class="realm" data-testid="hud-realm">{{ h.realm.number }} · {{ h.realm.name }}</span>
      </div>
      <div class="plaque small stats">
        <span class="stat"
          ><app-item-icon sprite="icon_gold" [size]="20" /><span
            class="gold-amount"
            data-testid="hud-gold"
            >{{ h.gold }}</span
          ></span
        >
        <span class="stat" title="Kills"
          ><span class="skull" aria-hidden="true">☠</span
          ><span data-testid="hud-kills">{{ h.kills }}</span></span
        >
      </div>
    </div>

    <div class="side">
      @if (medallions().length) {
        <ul class="medallions" aria-label="Party" data-testid="hud-party">
          @for (m of medallions(); track m.id) {
            <li><app-medallion [member]="m" [seat]="seatColor(m.seat)" /></li>
          }
        </ul>
      }
      @if (h.synergies.length) {
        <ul class="synergies" aria-label="Active synergies">
          @for (s of h.synergies; track s.id) {
            <li [title]="s.description">{{ s.name }}</li>
          }
        </ul>
      }
    </div>

    @if (h.boss; as boss) {
      <div class="boss" data-testid="boss-bar">
        <div class="boss-name">
          {{ boss.name }} <span>{{ boss.title }}</span>
        </div>
        <div
          class="boss-track"
          role="progressbar"
          [attr.aria-label]="boss.name + ' health'"
          [attr.aria-valuenow]="bossPercent()"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="boss-fill" [style.width.%]="bossPercent()"></div>
        </div>
      </div>
    }

    @if (h.phase === 'playing' && h.gate; as gate) {
      <div class="gate" data-testid="hud-gate" role="status">
        <span class="gate-title">The gate to {{ gate.to }} is open</span>
        <span class="gate-time"
          >Step into it · it opens by itself in {{ ceil(gate.closesIn) }} s</span
        >
      </div>
    }

    @if (h.merchant && !h.gate && h.phase === 'playing') {
      <div class="gate merchant" data-testid="hud-merchant" role="status">
        <span class="gate-title">The Wandering Merchant is near</span>
        <span class="gate-time"
          >Step into the golden ring to trade · leaves in {{ ceil(h.merchant.leavesIn) }} s</span
        >
      </div>
    }

    <div class="announcements" aria-live="polite">
      @for (a of announcements(); track a.id) {
        <!-- Kinds are prefixed: a bare "boss" class would take the boss banner's styles. -->
        <div [class]="'announcement kind-' + a.kind">{{ a.text }}</div>
      }
    </div>

    @if (layout() !== 'corners') {
      <div class="frieze" aria-hidden="true"></div>
    }
    @if (layout() === 'frieze') {
      @let keys = keysAt(0);
      <app-health-vessel class="solo-health" [health]="h.health" [maxHealth]="h.maxHealth" />
      <div class="solo-loadout"><app-loadout [hud]="h" /></div>
      <app-ability-slot class="solo-ability" [ability]="h.ability" [key]="keys.ability" />
      <div
        class="solo-stamina"
        [title]="keys.dash ? 'Stamina: hold Shift to sprint, ' + keys.dash + ' to dash' : 'Stamina'"
      >
        <app-stamina-vessel [stamina]="h.stamina" />
        <app-dash-pip [stamina]="h.stamina" [key]="keys.dash" />
      </div>
      @if (h.surge > 0) {
        <div class="surge" data-testid="hud-surge" role="status">
          Surge · +30% damage · {{ ceil(h.surge) }} s
        </div>
      }
    } @else {
      @for (p of players(); track $index; let i = $index) {
        <app-god-plaque
          [hud]="p"
          [place]="placeOf(i)"
          [index]="i"
          [name]="memberOf(p)?.name ?? 'Player ' + (i + 1)"
          [seat]="seatColor(memberOf(p)?.seat ?? i)"
          [keys]="keysAt(i)"
          [member]="memberOf(p)"
        />
      }
    }

    <div
      class="xp"
      role="progressbar"
      aria-label="Experience"
      [attr.aria-valuenow]="xpPercent()"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span class="level" data-testid="hud-level">{{ h.level }}</span>
      <div class="xp-track"><div class="xp-fill" [style.width.%]="xpPercent()"></div></div>
    </div>
  `,
  styleUrl: './hud.css',
})
export class Hud {
  /** Player 1's HUD (the only player's, unless several share the screen). */
  readonly hud = input.required<HudSnapshot>();
  /** Every player's HUD at a shared screen, in seat order. */
  readonly locals = input<readonly HudSnapshot[]>([]);
  /** Every local player's controls, for the key labels. */
  readonly controls = input<readonly ControlScheme[]>();
  readonly announcements = input<readonly Announcement[]>([]);
  /** Played by touch: the play screen's pause button sits in the top-left corner (spec: phone-play). */
  protected readonly touch = computed(() => this.controls()?.[0] === 'touch');

  /** The players at this screen. */
  protected readonly players = computed(() =>
    this.locals().length > 1 ? this.locals() : [this.hud()],
  );
  protected readonly layout = computed<HudLayout>(() => {
    const n = this.players().length;
    return n <= 1 ? 'frieze' : n === 2 ? 'duo' : 'corners';
  });
  /** Gods not played at this screen; each local god has its own plaque or the frieze (spec: hud / party health). */
  protected readonly medallions = computed(() => {
    const here = new Set(this.players().map((p) => this.memberOf(p)?.id));
    return this.hud().party.filter((m) => !here.has(m.id));
  });
  protected readonly time = computed(() => formatTime(this.hud().time));
  protected readonly xpPercent = computed(() =>
    Math.min(100, Math.round((this.hud().xp / Math.max(1, this.hud().xpToNext)) * 100)),
  );
  protected readonly bossPercent = computed(() => {
    const boss = this.hud().boss;
    return boss ? Math.round((boss.health / boss.maxHealth) * 100) : 0;
  });

  /** A player's own entry in the party: the one their snapshot marks as itself. */
  protected memberOf(hud: HudSnapshot): HudPartyMember | undefined {
    return hud.party.find((m) => m.self);
  }

  protected placeOf(index: number): PlaquePlace {
    if (this.layout() === 'duo') return index === 0 ? 'left' : 'right';
    return `corner-${index}` as PlaquePlace;
  }

  protected keysAt(index: number): { ability: string; dash: string } {
    return keysFor(this.controls()?.[index]);
  }

  protected seatColor(seat: number): string {
    return '#' + SEAT_COLORS[seat % SEAT_COLORS.length].toString(16).padStart(6, '0');
  }

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}
