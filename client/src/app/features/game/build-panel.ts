import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HudCombo, HudItem, HudSnapshot } from '../../../engine';
import { ItemIcon } from '../../shared/item-icon';

const TIER_NAMES = ['', 'Tier I', 'Tier II', 'Tier III'];
const STATE_LABEL: Record<HudCombo['state'], string> = {
  locked: 'Locked',
  ready: 'Ready',
  active: 'Active',
  maxed: 'Complete',
};

/**
 * The build panel (spec: hud / the build panel): the player's whole build and the tree of fusions and synergies
 * this god can reach, each requirement ticked or showing the level still needed. Fed by the throttled HUD snapshot
 * (D7); the run goes on behind it.
 */
@Component({
  selector: 'app-build-panel',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="drawer" role="dialog" aria-labelledby="build-title" data-testid="build-panel">
      <header>
        <h2 id="build-title">Your build</h2>
        <span class="hint">Tab to close</span>
        <button class="close" aria-label="Close the build panel" (click)="closed.emit()">✕</button>
      </header>

      <section aria-label="Loadout">
        <ul class="items">
          @for (item of held(); track item.id) {
            <li [title]="item.name">
              <app-item-icon [sprite]="item.sprite" [size]="34" [label]="item.name" />
              <span class="lvl">{{ levelText(item) }}</span>
            </li>
          }
        </ul>
      </section>

      @for (group of tiers(); track group.tier) {
        <section [attr.aria-label]="group.title">
          <h3>{{ group.title }}</h3>
          <ul class="combos">
            @for (c of group.combos; track c.id) {
              <li
                [class]="'combo ' + c.state"
                [attr.data-testid]="'combo-' + c.id"
                [title]="c.description"
              >
                <app-item-icon [sprite]="c.sprite" [size]="36" />
                <div class="body">
                  <div class="name">
                    {{ c.name }}
                    <span class="state" [attr.data-testid]="'combo-state-' + c.id">{{
                      stateText(c)
                    }}</span>
                  </div>
                  <div class="desc">{{ c.description }}</div>
                  <ul class="needs">
                    @for (n of c.needs; track $index) {
                      <li [class.met]="n.met">
                        @if (n.sprite) {
                          <app-item-icon [sprite]="n.sprite" [size]="16" />
                        }
                        {{ n.name }}
                        @if (n.need > 1) {
                          <span class="count">{{ n.have }}/{{ n.need }}</span>
                        }
                        <span class="mark" aria-hidden="true">{{ n.met ? '✓' : '·' }}</span>
                      </li>
                    }
                  </ul>
                </div>
              </li>
            }
          </ul>
        </section>
      }
    </aside>
  `,
  styles: `
    :host {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(400px, 100%);
      z-index: 5;
      pointer-events: none;
    }
    .drawer {
      pointer-events: auto;
      height: 100%;
      overflow: auto;
      padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
      background: linear-gradient(90deg, rgba(10, 8, 8, 0.82), rgba(14, 11, 10, 0.94));
      border-left: 1px solid rgba(201, 165, 90, 0.45);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.55);
      color: var(--text);
      animation: slide 0.15s ease-out;
    }
    header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      position: sticky;
      top: -12px;
      padding: 4px 0 6px;
      background: rgba(12, 10, 9, 0.96);
    }
    h2 {
      font-size: 1.2rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold-2);
      margin: 0;
    }
    .hint {
      color: var(--muted);
      font-size: 0.75rem;
      margin-right: auto;
    }
    .close {
      background: none;
      border: 1px solid rgba(201, 165, 90, 0.5);
      color: var(--gold-2);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
    }
    h3 {
      margin: 12px 0 6px;
      font-size: 0.85rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .items li {
      position: relative;
    }
    .lvl {
      position: absolute;
      right: -2px;
      bottom: -2px;
      font-size: 0.65rem;
      padding: 0 3px;
      background: rgba(0, 0, 0, 0.8);
      color: var(--gold-2);
      border-radius: 3px;
    }
    .combos {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .combo {
      display: flex;
      gap: 10px;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.03);
    }
    .combo.locked {
      opacity: 0.78;
    }
    .combo.ready {
      border-color: rgba(236, 213, 154, 0.85);
      box-shadow: inset 0 0 14px rgba(236, 213, 154, 0.18);
    }
    .combo.active,
    .combo.maxed {
      border-color: rgba(127, 232, 208, 0.6);
    }
    .body {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-family: var(--serif);
      color: var(--gold-2);
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .state {
      font-family: var(--sans, inherit);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      white-space: nowrap;
    }
    .ready .state {
      color: var(--gold-2);
    }
    .active .state,
    .maxed .state {
      color: #7fe8d0;
    }
    .desc {
      font-size: 0.78rem;
      color: #cfc5b0;
      margin: 2px 0 4px;
    }
    .needs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      font-size: 0.75rem;
      color: #e08a7a;
    }
    .needs li {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .needs li.met {
      color: #9fdc9a;
    }
    .count {
      font-variant-numeric: tabular-nums;
    }
    @keyframes slide {
      from {
        transform: translateX(30px);
        opacity: 0;
      }
    }
  `,
})
export class BuildPanel {
  readonly hud = input.required<HudSnapshot>();
  readonly closed = output<void>();

  /** Everything held, in the order of the loadout: weapons, armour, relics, skills, fusions, ascensions. */
  protected readonly held = computed<HudItem[]>(() => {
    const h = this.hud();
    return [
      ...h.weapons,
      ...(h.armour ? [h.armour] : []),
      ...h.relics,
      ...h.build.skills,
      ...h.build.fusions,
      ...h.build.ascensions,
    ];
  });

  /** The tree by tier; synergies after the fusions, as they activate on their own. */
  protected readonly tiers = computed(() => {
    const tree = this.hud().build.tree;
    const groups: { tier: string; title: string; combos: HudCombo[] }[] = [];
    for (const tier of [1, 2, 3]) {
      const combos = tree.filter((c) => c.kind === 'fusion' && c.tier === tier);
      if (combos.length)
        groups.push({ tier: `f${tier}`, title: `Fusions · ${TIER_NAMES[tier]}`, combos });
    }
    const synergies = tree.filter((c) => c.kind === 'synergy');
    if (synergies.length)
      groups.push({ tier: 's', title: 'Synergies · activate on their own', combos: synergies });
    return groups;
  });

  protected levelText(item: HudItem): string {
    if (item.maxLevel === 0) return `${item.level}`;
    if (item.maxLevel <= 1) return '';
    return item.level >= item.maxLevel ? 'MAX' : `${item.level}`;
  }

  protected stateText(c: HudCombo): string {
    if (c.kind === 'synergy') return c.level > 0 ? 'Active' : 'Locked';
    if (c.state === 'active') return `Lv ${c.level}/${c.maxLevel}`;
    return STATE_LABEL[c.state];
  }
}
