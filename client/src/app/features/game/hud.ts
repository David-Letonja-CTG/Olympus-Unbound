import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HudSnapshot } from '../../../engine';
import { formatTime, ItemIcon } from '../../shared/item-icon';

export interface Announcement {
  readonly id: number;
  readonly text: string;
  readonly kind: 'elite' | 'boss' | 'synergy' | 'info';
}

/** Outline of the health amphora (viewBox 0 0 100 140). */
const AMPHORA =
  'M38 6 H62 V16 C62 22 58 24 58 30 C78 38 90 58 88 82 C86 104 72 122 58 130 V136 H42 V130 C28 122 14 104 12 82 C10 58 22 38 42 30 C42 24 38 22 38 16 Z';
const VESSEL_TOP = 30;
const VESSEL_BOTTOM = 130;

/**
 * The run HUD (spec: hud). Updated from throttled snapshots, never per frame (D7). Health is shown in an amphora,
 * the ability in an iron slot with a cooldown sweep, the boss in a banner (spec: hud / themed, legible HUD).
 */
@Component({
  selector: 'app-hud',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = hud();
    <div class="top">
      @if (h.synergies.length) {
        <ul class="synergies" aria-label="Active synergies">
          @for (s of h.synergies; track s.id) {
            <li [title]="s.description">{{ s.name }}</li>
          }
        </ul>
      }
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

    @if (h.gate; as gate) {
      <div class="gate" data-testid="hud-gate" role="status">
        <span class="gate-title">The gate to {{ gate.to }} is open</span>
        <span class="gate-time"
          >Step into it · it opens by itself in {{ ceil(gate.closesIn) }} s</span
        >
      </div>
    }

    <div class="announcements" aria-live="polite">
      @for (a of announcements(); track a.id) {
        <!-- Kinds are prefixed: a bare "boss" class would take the boss banner's styles. -->
        <div [class]="'announcement kind-' + a.kind">{{ a.text }}</div>
      }
    </div>

    <div
      class="vessel"
      role="progressbar"
      aria-label="Health"
      [attr.aria-valuenow]="round(h.health)"
      aria-valuemin="0"
      [attr.aria-valuemax]="round(h.maxHealth)"
    >
      <svg viewBox="0 0 100 140" aria-hidden="true">
        <defs>
          <clipPath id="amphora-clip"><path [attr.d]="amphora" /></clipPath>
          <linearGradient id="blood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#4a0806" />
            <stop offset="0.45" stop-color="#b3221b" />
            <stop offset="1" stop-color="#3a0605" />
          </linearGradient>
          <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e3c27a" />
            <stop offset="0.5" stop-color="#8a6430" />
            <stop offset="1" stop-color="#3a2810" />
          </linearGradient>
        </defs>
        <path [attr.d]="amphora" fill="rgba(10,6,6,0.85)" />
        <g clip-path="url(#amphora-clip)">
          <rect
            x="0"
            [attr.y]="fillY()"
            width="100"
            height="140"
            fill="url(#blood)"
            data-testid="health-fill"
          />
          <rect x="0" [attr.y]="fillY()" width="100" height="3" fill="rgba(255,140,120,0.55)" />
          <path
            d="M22 60 C20 80 24 100 34 116"
            stroke="rgba(255,255,255,0.18)"
            stroke-width="5"
            fill="none"
            stroke-linecap="round"
          />
        </g>
        <path d="M14 70 H86 M12 84 H88" stroke="rgba(227,194,122,0.35)" stroke-width="1.2" />
        <path [attr.d]="amphora" fill="none" stroke="url(#bronze)" stroke-width="3.5" />
        <path
          d="M42 30 C30 30 24 40 30 52 M58 30 C70 30 76 40 70 52"
          fill="none"
          stroke="url(#bronze)"
          stroke-width="4"
        />
      </svg>
      <span class="vessel-text" data-testid="hud-health"
        >{{ round(h.health) }} / {{ round(h.maxHealth) }}</span
      >
    </div>

    <div class="bottom">
      <div class="loadout" aria-label="Loadout">
        <ul>
          @for (w of h.weapons; track w.id) {
            <li
              class="slot"
              [title]="w.name + ' level ' + w.level"
              [attr.data-testid]="'hud-weapon-' + w.id"
            >
              <app-item-icon [sprite]="w.sprite" [size]="38" [label]="w.name" />
              <span class="lvl">{{ w.level === w.maxLevel ? 'MAX' : w.level }}</span>
            </li>
          }
        </ul>
        <ul>
          @if (h.armour; as a) {
            <li class="slot small" [title]="a.name + ' level ' + a.level">
              <app-item-icon [sprite]="a.sprite" [size]="30" [label]="a.name" />
              <span class="lvl">{{ a.level }}</span>
            </li>
          }
          @for (r of h.relics; track r.id) {
            <li class="slot small" [title]="r.name">
              <app-item-icon [sprite]="r.sprite" [size]="30" [label]="r.name" />
            </li>
          }
        </ul>
      </div>
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
    </div>

    <div class="ability" [class.ready]="h.ability.remaining <= 0" [title]="h.ability.name">
      <app-item-icon [sprite]="h.ability.sprite" [size]="52" />
      @if (h.ability.remaining > 0) {
        <div class="sweep" data-testid="ability-sweep" [style.--share]="sweep()"></div>
        <span class="seconds" data-testid="ability-seconds">{{ ceil(h.ability.remaining) }}</span>
      }
      <span class="key">Space</span>
    </div>
  `,
  styleUrl: './hud.css',
})
export class Hud {
  readonly hud = input.required<HudSnapshot>();
  readonly announcements = input<readonly Announcement[]>([]);

  protected readonly amphora = AMPHORA;
  protected readonly time = computed(() => formatTime(this.hud().time));
  protected readonly xpPercent = computed(() =>
    Math.min(100, Math.round((this.hud().xp / Math.max(1, this.hud().xpToNext)) * 100)),
  );
  /** Fraction of health, 0–1. */
  protected readonly healthFraction = computed(() =>
    Math.max(0, Math.min(1, this.hud().health / this.hud().maxHealth)),
  );
  /** Top of the liquid in the amphora's coordinates. */
  protected readonly fillY = computed(
    () => VESSEL_BOTTOM - (VESSEL_BOTTOM - VESSEL_TOP) * this.healthFraction(),
  );
  protected readonly bossPercent = computed(() => {
    const boss = this.hud().boss;
    return boss ? Math.round((boss.health / boss.maxHealth) * 100) : 0;
  });
  /** A dark sweep covering the remaining share of the cooldown (spec: hud / ability slot). */
  protected readonly sweep = computed(() => {
    const { cooldown, remaining } = this.hud().ability;
    const share = cooldown > 0 ? Math.min(1, remaining / cooldown) : 0;
    return `${(share * 100).toFixed(1)}%`;
  });

  protected round(n: number): number {
    return Math.ceil(n);
  }

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}
