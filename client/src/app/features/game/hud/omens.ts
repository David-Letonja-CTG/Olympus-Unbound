import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HudBoon, HudEncounter } from '../../../../engine';
import { ItemIcon } from '../../../shared/item-icon';

/**
 * The Director of Chaos's encounters under way and this god's blessings (spec: hud / encounters on the hud), in the HUD's
 * left column: each encounter's name, what to do, foes left and seconds to its next turn, and a contract's terms.
 */
@Component({
  selector: 'app-hud-omens',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './omens.css',
  template: `
    @if (encounters().length) {
      <ul class="omens" aria-label="Encounters" data-testid="hud-encounters">
        @for (e of encounters(); track e.uid) {
          <li [class.major]="e.major" [class.warning]="e.phase === 'telegraph'">
            <span class="omen-name">{{ e.name }}</span>
            <span class="omen-goal">{{ e.objective }}</span>
            @if (countOf(e); as count) {
              <span class="omen-count">{{ count }}</span>
            }
            @if (e.risk) {
              <span class="omen-terms">Risk: {{ e.risk }}</span>
            }
            @if (e.reward) {
              <span class="omen-terms reward">Reward: {{ e.reward }}</span>
            }
          </li>
        }
      </ul>
    }
    @if (boons().length) {
      <ul class="boons" aria-label="Blessings" data-testid="hud-boons">
        @for (b of boons(); track b.id) {
          <li [title]="b.description">
            <app-item-icon [sprite]="b.sprite" [size]="18" />{{ b.name }} · {{ ceil(b.left) }} s
          </li>
        }
      </ul>
    }
  `,
})
export class HudOmens {
  readonly encounters = input.required<readonly HudEncounter[]>();
  readonly boons = input.required<readonly HudBoon[]>();

  /** "12 left · 40 s": foes left and the seconds to its next turn, as far as the encounter has them. */
  protected countOf(e: HudEncounter): string {
    const parts: string[] = [];
    if (e.left !== undefined) parts.push(`${e.left} left`);
    if (e.seconds !== undefined) parts.push(`${Math.ceil(e.seconds)} s`);
    return parts.join(' · ');
  }

  protected ceil(n: number): number {
    return Math.ceil(n);
  }
}
