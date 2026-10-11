import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { ATTRIBUTION_LICENCES, GameContent } from '../../engine';
import { GAME_CONTENT } from '../core/game-content';

/** One credited work and what the game uses it for. */
interface Credit {
  readonly title: string;
  readonly author: string;
  readonly licence: string;
  readonly source: string;
  readonly uses: readonly string[];
  /** Notes shared by every use (e.g. how the sheets were made), shown once. */
  readonly notes: readonly string[];
}

/**
 * The credits (spec: asset-pipeline / licence registry): a button that opens them in a modal dialog. Every
 * external work whose licence asks for credit, grouped by work — many rendered sheets share one source model —
 * with what the game uses it for. Closes with Escape, the close button or a click outside.
 */
@Component({
  selector: 'app-credits-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn" data-testid="credits-button" (click)="open()">Credits</button>
    <dialog
      #dialog
      class="dialog"
      data-testid="credits"
      aria-labelledby="credits-title"
      (click)="closeOutside($event)"
      (keydown.escape)="close()"
      tabindex="-1"
    >
      <header>
        <h2 id="credits-title">Credits</h2>
        <button type="button" class="close" aria-label="Close credits" (click)="close()">×</button>
      </header>
      <p class="intro">
        Design, code, sound, the world and the interface are original to Olympus Unbound. The
        characters are rendered by the project from the works below; their licences ask for this
        credit.
      </p>
      <ul>
        @for (c of credits(); track c.title + c.author) {
          <li>
            <p class="work">
              <strong>{{ c.title }}</strong> by {{ c.author }}
              <span class="licence">{{ c.licence }}</span>
              <a [href]="c.source" target="_blank" rel="noopener noreferrer">source</a>
            </p>
            @for (n of c.notes; track n) {
              <p class="note">{{ n }}</p>
            }
            @if (c.uses.length) {
              <ul class="uses">
                @for (u of c.uses; track u) {
                  <li>{{ u }}</li>
                }
              </ul>
            }
          </li>
        }
      </ul>
    </dialog>
  `,
  styles: `
    .dialog {
      width: min(640px, 92vw);
      max-height: min(78vh, 720px);
      padding: 0;
      color: var(--text);
      background: var(--stone), var(--panel);
      background-blend-mode: soft-light, normal;
      border: 1px solid #050404;
      box-shadow:
        inset 0 0 0 1px rgba(201, 165, 90, 0.45),
        0 18px 48px rgba(0, 0, 0, 0.75);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .dialog:not([open]) {
      display: none;
    }
    .dialog::backdrop {
      background: radial-gradient(ellipse at center, rgba(12, 8, 6, 0.55), rgba(0, 0, 0, 0.85));
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px 8px;
      border-bottom: 1px solid rgba(201, 165, 90, 0.25);
    }
    h2 {
      font-family: var(--display);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold-2);
      font-size: 1.2rem;
    }
    .close {
      background: none;
      border: 1px solid var(--line);
      color: var(--gold);
      width: 32px;
      height: 32px;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
    .intro {
      padding: 10px 18px 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 8px 18px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .work {
      margin: 0;
      color: var(--text);
    }
    .licence {
      white-space: nowrap;
      margin: 0 6px;
      padding: 0 6px;
      border: 1px solid var(--gold);
      font-size: 0.75rem;
      color: var(--gold);
    }
    a {
      color: var(--gold);
      font-size: 0.85rem;
    }
    .note {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 0.82rem;
      font-style: italic;
    }
    .uses {
      padding: 4px 0 0 16px;
      gap: 2px;
      overflow: visible;
    }
    .uses li {
      list-style: disc;
      color: var(--muted);
      font-size: 0.82rem;
    }
  `,
})
export class CreditsDialog {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly credits = computed<readonly Credit[]>(() => {
    const groups = new Map<
      string,
      { credit: Omit<Credit, 'uses' | 'notes'>; uses: string[]; notes: string[] }
    >();
    for (const f of this.content.assets.files) {
      const l = f.licence;
      const credited = f.type === 'font' || ATTRIBUTION_LICENCES.includes(l.name);
      if (!credited) continue;
      const key = [l.title, l.author, l.name, l.source].join('|');
      const group = groups.get(key) ?? {
        credit: { title: l.title, author: l.author, licence: l.name, source: l.source },
        uses: [],
        notes: [],
      };
      // "What it is. How it was made." — the use per file, the rest once per work.
      const [use, ...rest] = (l.notes ?? '').split('. ');
      if (use && !group.uses.includes(use)) group.uses.push(use);
      const note = rest.join('. ');
      if (note && !group.notes.includes(note)) group.notes.push(note);
      groups.set(key, group);
    }
    return [...groups.values()].map((g) => ({ ...g.credit, uses: g.uses, notes: g.notes }));
  });

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) return;
    // jsdom (tests) has no showModal; the attribute opens it there.
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  close(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }

  /** A click on the backdrop (the dialog element itself, outside its content) closes it. */
  protected closeOutside(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
