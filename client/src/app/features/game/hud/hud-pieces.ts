import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { ControlScheme, HudItem, HudSnapshot } from '../../../../engine';
import { ItemIcon } from '../../../shared/item-icon';

/*
 * The pieces every player's HUD is built from (spec: hud / local players on the hud): the orbs of blood and ichor,
 * the dash pip, the ability slot and the loadout. They carry no styles of their own: hud-pieces.css styles them
 * wherever the layout puts them, so a piece looks the same in the frieze, a corner plaque or alone.
 */

/** The orb's sphere (viewBox 0 0 200 250): centre and radius; the liquid reaches from its top to its bottom. */
const CX = 100;
const CY = 112;
const R = 62;
const TOP = CY - R;
const BOTTOM = CY + R;

/** Each instance's SVG ids must be unique on the page. */
let nextId = 0;

/** The share of a cooldown still to run, as a sweep's CSS percentage. */
export function share(remaining: number, cooldown: number): string {
  const part = cooldown > 0 ? Math.max(0, Math.min(1, remaining / cooldown)) : 0;
  return `${(part * 100).toFixed(1)}%`;
}

/** The keys a player's ability and dash answer to, as labels (spec: player-control / controls per local player). */
export function keysFor(scheme: ControlScheme | undefined): { ability: string; dash: string } {
  // The touch controls have their own buttons (spec: phone-play / touch controls): no key to name.
  if (scheme === 'touch') return { ability: '', dash: '' };
  if (scheme === 'keys-right') return { ability: 'Enter', dash: 'R-Ctrl' };
  if (scheme?.startsWith('pad')) return { ability: 'A', dash: 'B' };
  return { ability: 'Space', dash: 'E' };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * A crystal orb on a bronze tripod, filled to `fraction` with blood or golden ichor: the HUD's Diablo-like vessels in
 * Greek dress (owner's choice, 2026-10-20). Optionally ringed with stamina (shared screens), marked where a dash
 * becomes affordable (the ichor orb), and capped with the seat's colour.
 */
@Component({
  selector: 'app-orb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 200 250" aria-hidden="true">
      <defs>
        <clipPath [attr.id]="'orb-clip-' + id">
          <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" />
        </clipPath>
        <linearGradient [attr.id]="'liquid-' + id" x1="0" x2="1">
          @if (kind() === 'blood') {
            <stop offset="0" stop-color="#3a0604" />
            <stop offset="0.35" stop-color="#b3221b" />
            <stop offset="0.55" stop-color="#e2493a" />
            <stop offset="1" stop-color="#2e0503" />
          } @else {
            <stop offset="0" stop-color="#6b4508" />
            <stop offset="0.35" stop-color="#f2c75a" />
            <stop offset="0.55" stop-color="#ffe9a6" />
            <stop offset="1" stop-color="#5a3a06" />
          }
        </linearGradient>
        <radialGradient [attr.id]="'glow-' + id">
          <stop
            offset="0"
            [attr.stop-color]="kind() === 'blood' ? '#ff5a40' : '#ffd76a'"
            stop-opacity="0.4"
          />
          <stop
            offset="1"
            [attr.stop-color]="kind() === 'blood' ? '#ff5a40' : '#ffd76a'"
            stop-opacity="0"
          />
        </radialGradient>
        <radialGradient [attr.id]="'glass-' + id" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#9fc7d8" stop-opacity="0.22" />
          <stop offset="0.6" stop-color="#1b2a33" stop-opacity="0.6" />
          <stop offset="1" stop-color="#05080a" stop-opacity="0.92" />
        </radialGradient>
        <linearGradient [attr.id]="'gold-' + id" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0b8" />
          <stop offset="0.35" stop-color="#d8a944" />
          <stop offset="0.7" stop-color="#7a5418" />
          <stop offset="1" stop-color="#e6c06a" />
        </linearGradient>
        <linearGradient [attr.id]="'bronze-' + id" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e3c27a" />
          <stop offset="0.5" stop-color="#8a6430" />
          <stop offset="1" stop-color="#3a2810" />
        </linearGradient>
      </defs>
      <circle [attr.cx]="cx" [attr.cy]="cy" r="88" [attr.fill]="'url(#glow-' + id + ')'" />
      @if (ring() !== undefined) {
        <!-- Stamina around the orb, open at the foot (spec: hud / cooldowns and stamina). -->
        <circle
          class="ring-track"
          [attr.cx]="cx"
          [attr.cy]="cy"
          r="76"
          pathLength="100"
          stroke-dasharray="75 100"
          [attr.transform]="'rotate(135 ' + cx + ' ' + cy + ')'"
        />
        <circle
          class="ring-fill"
          [attr.cx]="cx"
          [attr.cy]="cy"
          r="76"
          pathLength="100"
          [attr.transform]="'rotate(135 ' + cx + ' ' + cy + ')'"
          [attr.stroke-dasharray]="(ring() ?? 0) * 75 + ' 100'"
          [attr.data-testid]="ringTestId()"
          [attr.data-share]="round((ring() ?? 0) * 100)"
        />
      }
      <!-- The tripod: three lion-footed bronze legs. -->
      <g
        [attr.stroke]="'url(#bronze-' + id + ')'"
        stroke-width="8"
        fill="none"
        stroke-linecap="round"
      >
        <path d="M60 162 C52 192 48 212 40 232" />
        <path d="M100 176 V234" />
        <path d="M140 162 C148 192 152 212 160 232" />
      </g>
      <g [attr.fill]="'url(#bronze-' + id + ')'" stroke="#2a1c08">
        <ellipse cx="38" cy="236" rx="11" ry="6" />
        <ellipse cx="100" cy="238" rx="11" ry="6" />
        <ellipse cx="162" cy="236" rx="11" ry="6" />
      </g>
      <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" [attr.fill]="'url(#glass-' + id + ')'" />
      <g [attr.clip-path]="'url(#orb-clip-' + id + ')'">
        <rect
          x="30"
          [attr.y]="fillY()"
          width="140"
          height="140"
          [attr.fill]="'url(#liquid-' + id + ')'"
          [attr.data-testid]="fillTestId()"
          [attr.data-share]="round(fraction() * 100)"
        />
        <ellipse
          [attr.cx]="cx"
          [attr.cy]="fillY()"
          rx="64"
          ry="3.5"
          [attr.fill]="kind() === 'blood' ? '#ff9a86' : '#fff4c8'"
          opacity="0.75"
        />
        <g
          fill="none"
          [attr.stroke]="kind() === 'blood' ? '#ffc2b6' : '#fff6d8'"
          stroke-opacity="0.55"
        >
          <circle cx="86" [attr.cy]="fillY() + 20" r="3" />
          <circle cx="112" [attr.cy]="fillY() + 36" r="2" />
          <circle cx="98" [attr.cy]="fillY() + 52" r="2.6" />
        </g>
      </g>
      @if (cost() !== undefined) {
        <!-- Above this line there is stamina enough for a dash. -->
        <path
          [attr.d]="costLine()"
          stroke="rgba(255,250,230,0.7)"
          stroke-width="2"
          stroke-dasharray="5 4"
        />
      }
      <path
        d="M66 86 C72 70 86 60 102 56"
        stroke="#fff"
        stroke-opacity="0.35"
        stroke-width="5"
        fill="none"
        stroke-linecap="round"
      />
      <circle
        [attr.cx]="cx"
        [attr.cy]="cy"
        [attr.r]="r"
        fill="none"
        [attr.stroke]="'url(#gold-' + id + ')'"
        stroke-width="3.5"
      />
      <!-- The bronze ring that holds the orb, with a Greek key. -->
      <ellipse
        cx="100"
        cy="158"
        rx="56"
        ry="11"
        fill="none"
        [attr.stroke]="'url(#bronze-' + id + ')'"
        stroke-width="9"
      />
      <path
        d="M52 158 h8 v-4 h6 v6 M70 164 h8 v-4 h6 v6 M88 167 h8 v-4 h6 v6 M106 167 h8 v-4 h6 v6 M124 164 h8 v-4 h6 v6"
        stroke="#2a1c08"
        stroke-width="1.4"
        fill="none"
      />
      <circle
        [attr.cx]="cx"
        [attr.cy]="cy - r - 4"
        r="8"
        [attr.fill]="seat() ?? 'url(#gold-' + id + ')'"
        stroke="#3a2810"
        stroke-width="2"
      />
    </svg>
  `,
})
export class Orb {
  /** How full, 0–1. */
  readonly fraction = input.required<number>();
  readonly kind = input<'blood' | 'ichor'>('blood');
  /** A ring of stamina around the orb, 0–1. */
  readonly ring = input<number>();
  /** Where a dash becomes affordable, 0–1 (the ichor orb). */
  readonly cost = input<number>();
  /** The seat's colour on the knob, on a shared screen. */
  readonly seat = input<string>();
  readonly fillTestId = input<string>();
  readonly ringTestId = input<string>();

  protected readonly id = ++nextId;
  protected readonly cx = CX;
  protected readonly cy = CY;
  protected readonly r = R;
  /** Top of the liquid in the orb's coordinates. */
  protected readonly fillY = computed(() => BOTTOM - (BOTTOM - TOP) * clamp01(this.fraction()));
  /** The chord across the sphere at the dash's cost. */
  protected readonly costLine = computed(() => {
    const y = BOTTOM - (BOTTOM - TOP) * clamp01(this.cost() ?? 0);
    const half = Math.sqrt(Math.max(0, R * R - (y - CY) ** 2)) - 3;
    return `M${CX - half} ${y} H${CX + half}`;
  });

  protected round(n: number): number {
    return Math.round(n);
  }
}

/** The orb of blood: health, with an optional ring of stamina around it (spec: hud / themed, legible hud). */
@Component({
  selector: 'app-health-vessel',
  imports: [Orb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Every layout has a health orb, so the pieces' styles come with it (they apply under app-hud only).
  encapsulation: ViewEncapsulation.None,
  styleUrl: './hud-pieces.css',
  template: `
    <div
      class="vessel"
      [class.fallen]="fallen()"
      role="progressbar"
      [attr.aria-label]="label() + ' health'"
      [attr.aria-valuenow]="ceil(health())"
      aria-valuemin="0"
      [attr.aria-valuemax]="ceil(maxHealth())"
    >
      <app-orb
        kind="blood"
        [fraction]="health() / Math.max(1, maxHealth())"
        [ring]="stamina()"
        [seat]="seat()"
        [fillTestId]="'health-fill' + suffix()"
        [ringTestId]="'stamina-ring' + suffix()"
      />
      <span class="vessel-text" [attr.data-testid]="'hud-health' + suffix()">
        @if (fallen()) {
          Fallen · {{ round(revive() * 100) }}%
        } @else {
          {{ ceil(health()) }} / {{ ceil(maxHealth()) }}
        }
      </span>
    </div>
  `,
})
export class HealthVessel {
  readonly health = input.required<number>();
  readonly maxHealth = input.required<number>();
  /** Stamina, 0–1, drawn as a ring; absent where the ichor orb shows it instead. */
  readonly stamina = input<number>();
  /** The seat's colour, on a shared screen. */
  readonly seat = input<string>();
  readonly fallen = input(false);
  /** How far a fallen god's revive has come, 0–1. */
  readonly revive = input(0);
  readonly label = input('Your');
  /** Test-ID suffix: empty for player 1, "-p2" and on for the others. */
  readonly suffix = input('');

  protected readonly Math = Math;

  protected ceil(n: number): number {
    return Math.ceil(n);
  }

  protected round(n: number): number {
    return Math.round(n);
  }
}

/** The orb of ichor: stamina, marked where a dash becomes affordable (spec: hud / cooldowns and stamina). */
@Component({
  selector: 'app-stamina-vessel',
  imports: [Orb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = stamina();
    <div
      class="vessel stamina-orb"
      role="progressbar"
      aria-label="Stamina"
      [attr.aria-valuenow]="round(s.value)"
      aria-valuemin="0"
      [attr.aria-valuemax]="s.max"
    >
      <app-orb
        kind="ichor"
        [fraction]="s.max > 0 ? s.value / s.max : 0"
        [cost]="s.max > 0 ? s.dashCost / s.max : 0"
        fillTestId="stamina-fill"
      />
      <span class="vessel-text">{{ round(s.value) }} / {{ s.max }}</span>
    </div>
  `,
})
export class StaminaVessel {
  readonly stamina = input.required<HudSnapshot['stamina']>();

  protected round(n: number): number {
    return Math.round(n);
  }
}

/** The dash: its recovery as a sweep, dimmed without stamina enough for one. */
@Component({
  selector: 'app-dash-pip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = stamina();
    <div
      class="dash"
      [attr.data-testid]="'dash-pip' + suffix()"
      [class.tired]="s.value < s.dashCost"
      [class.ready]="s.dashRemaining <= 0 && s.value >= s.dashCost"
      [title]="key() ? 'Dash (' + key() + ')' : 'Dash'"
    >
      <span class="dash-glyph" aria-hidden="true">»</span>
      <div class="sweep" [style.--share]="sweep()"></div>
      @if (key()) {
        <span class="dash-key">{{ key() }}</span>
      }
    </div>
  `,
})
export class DashPip {
  readonly stamina = input.required<HudSnapshot['stamina']>();
  readonly key = input('E');
  readonly suffix = input('');

  protected readonly sweep = computed(() =>
    share(this.stamina().dashRemaining, this.stamina().dashCooldown),
  );
}

/** The divine ability: its icon, a smooth cooldown sweep, the seconds left and its key. */
@Component({
  selector: 'app-ability-slot',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let a = ability();
    <div class="ability" [class.ready]="a.remaining <= 0" [title]="a.name">
      <app-item-icon [sprite]="a.sprite" [size]="size()" />
      <!-- Always present, so the sweep's transition can run it down smoothly (spec: hud / cooldowns and stamina). -->
      <div
        class="sweep"
        [attr.data-testid]="'ability-sweep' + suffix()"
        [style.--share]="sweep()"
      ></div>
      @if (a.remaining > 0) {
        <span class="seconds" [attr.data-testid]="'ability-seconds' + suffix()">{{
          ceil(a.remaining)
        }}</span>
      }
      @if (key()) {
        <span class="key">{{ key() }}</span>
      }
    </div>
  `,
})
export class AbilitySlot {
  readonly ability = input.required<HudSnapshot['ability']>();
  readonly key = input('Space');
  readonly size = input(52);
  readonly suffix = input('');

  protected readonly sweep = computed(() =>
    share(this.ability().remaining, this.ability().cooldown),
  );

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}

/** Weapons with their cooldowns, then armour, relics and companions. */
@Component({
  selector: 'app-loadout',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = hud();
    <div class="loadout" aria-label="Loadout">
      <ul>
        @for (w of h.weapons; track w.id) {
          <li
            class="slot"
            [title]="w.name + ' level ' + w.level"
            [attr.data-testid]="'hud-weapon-' + w.id + suffix()"
          >
            <app-item-icon [sprite]="w.sprite" [size]="size()" [label]="w.name" />
            @if (w.cooldown) {
              <div
                class="sweep"
                [attr.data-testid]="'weapon-sweep-' + w.id + suffix()"
                [style.--share]="sweep(w)"
              ></div>
            }
            <span class="lvl">{{ w.level === w.maxLevel ? 'MAX' : w.level }}</span>
          </li>
        }
      </ul>
      <ul>
        @if (h.armour; as a) {
          <li class="slot small" [title]="a.name + ' level ' + a.level">
            <app-item-icon [sprite]="a.sprite" [size]="smallSize()" [label]="a.name" />
            <span class="lvl">{{ a.level }}</span>
          </li>
        }
        @for (r of h.relics; track r.id) {
          <li class="slot small" [title]="r.name">
            <app-item-icon [sprite]="r.sprite" [size]="smallSize()" [label]="r.name" />
          </li>
        }
        @for (c of h.companions; track c.id) {
          <li
            class="slot small companion"
            [title]="c.name"
            [attr.data-testid]="'hud-companion-' + c.id + suffix()"
          >
            <app-item-icon [sprite]="c.sprite" [size]="smallSize()" [label]="c.name" />
          </li>
        }
      </ul>
    </div>
  `,
})
export class Loadout {
  readonly hud = input.required<HudSnapshot>();
  readonly size = input(38);
  readonly smallSize = input(30);
  readonly suffix = input('');

  protected sweep(w: HudItem): string {
    return share(w.remaining ?? 0, w.cooldown ?? 0);
  }
}
