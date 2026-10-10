import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HudSnapshot } from '../../../engine';
import { formatTime, ItemIcon } from '../../shared/item-icon';

export interface Announcement {
  readonly id: number;
  readonly text: string;
  readonly kind: 'elite' | 'boss' | 'synergy' | 'info';
}

/** The run HUD (spec: hud). Updated from throttled snapshots, never per frame (D7). */
@Component({
  selector: 'app-hud',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = hud();
    <div
      class="xp"
      role="progressbar"
      aria-label="Experience"
      [attr.aria-valuenow]="xpPercent()"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="xp-fill" [style.width.%]="xpPercent()"></div>
      <span class="level" data-testid="hud-level">Lv {{ h.level }}</span>
    </div>

    <div class="top-left">
      <div
        class="health"
        role="progressbar"
        aria-label="Health"
        [attr.aria-valuenow]="round(h.health)"
        aria-valuemin="0"
        [attr.aria-valuemax]="h.maxHealth"
      >
        <div class="health-fill" [style.width.%]="healthPercent()"></div>
        <span data-testid="hud-health">{{ round(h.health) }} / {{ round(h.maxHealth) }}</span>
      </div>
      @if (h.synergies.length) {
        <ul class="synergies" aria-label="Active synergies">
          @for (s of h.synergies; track s.id) {
            <li [title]="s.description">✦ {{ s.name }}</li>
          }
        </ul>
      }
    </div>

    <div class="timer" data-testid="hud-time">{{ time() }}</div>

    <div class="top-right">
      <span class="stat"
        ><app-item-icon sprite="icon_gold" [size]="20" />
        <span class="gold-amount" data-testid="hud-gold">{{ h.gold }}</span></span
      >
      <span class="stat" title="Kills"
        >⚔ <span data-testid="hud-kills">{{ h.kills }}</span></span
      >
    </div>

    @if (h.boss; as boss) {
      <div class="boss" data-testid="boss-bar">
        <div class="boss-name">
          {{ boss.name }} <span>— {{ boss.title }}</span>
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

    <div class="announcements" aria-live="polite">
      @for (a of announcements(); track a.id) {
        <div class="announcement" [class]="'announcement ' + a.kind">{{ a.text }}</div>
      }
    </div>

    <div class="loadout" aria-label="Loadout">
      <ul>
        @for (w of h.weapons; track w.id) {
          <li [title]="w.name + ' level ' + w.level" [attr.data-testid]="'hud-weapon-' + w.id">
            <app-item-icon [sprite]="w.sprite" [size]="36" [label]="w.name" />
            <span class="lvl">{{ w.level === w.maxLevel ? 'MAX' : w.level }}</span>
          </li>
        }
      </ul>
      <ul>
        @if (h.armour; as a) {
          <li [title]="a.name + ' level ' + a.level">
            <app-item-icon [sprite]="a.sprite" [size]="30" [label]="a.name" />
            <span class="lvl">{{ a.level }}</span>
          </li>
        }
        @for (r of h.relics; track r.id) {
          <li [title]="r.name">
            <app-item-icon [sprite]="r.sprite" [size]="30" [label]="r.name" />
          </li>
        }
      </ul>
    </div>

    <div class="ability" [class.ready]="h.ability.remaining <= 0" [title]="h.ability.name">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="28" class="track" />
        <circle cx="32" cy="32" r="28" class="fill" [attr.stroke-dasharray]="abilityDash()" />
      </svg>
      <app-item-icon [sprite]="h.ability.sprite" [size]="40" />
      <span class="key">{{ h.ability.remaining > 0 ? ceil(h.ability.remaining) : 'SPACE' }}</span>
    </div>
  `,
  styleUrl: './hud.css',
})
export class Hud {
  readonly hud = input.required<HudSnapshot>();
  readonly announcements = input<readonly Announcement[]>([]);

  protected readonly time = computed(() => formatTime(this.hud().time));
  protected readonly xpPercent = computed(() =>
    Math.min(100, Math.round((this.hud().xp / Math.max(1, this.hud().xpToNext)) * 100)),
  );
  protected readonly healthPercent = computed(() =>
    Math.max(0, Math.min(100, (this.hud().health / this.hud().maxHealth) * 100)),
  );
  protected readonly bossPercent = computed(() => {
    const boss = this.hud().boss;
    return boss ? Math.round((boss.health / boss.maxHealth) * 100) : 0;
  });
  protected readonly abilityDash = computed(() => {
    const { cooldown, remaining } = this.hud().ability;
    const circumference = 2 * Math.PI * 28;
    const ready = cooldown > 0 ? 1 - remaining / cooldown : 1;
    return `${circumference * ready} ${circumference}`;
  });

  protected round(n: number): number {
    return Math.ceil(n);
  }

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}
