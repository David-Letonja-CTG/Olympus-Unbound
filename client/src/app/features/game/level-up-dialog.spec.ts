import { TestBed } from '@angular/core/testing';
import { UpgradeChoice, UpgradeOffer } from '../../../engine';
import { LevelUpDialog } from './level-up-dialog';

const ware = (itemId: string, price: number): UpgradeOffer => ({
  kind: 'ware',
  itemId,
  name: itemId,
  description: '',
  level: 1,
  maxLevel: 1,
  sprite: 'ware_eagle',
  color: 0,
  price,
});

const shop: UpgradeChoice = {
  id: 7,
  playerId: 1,
  source: 'shop',
  level: 4,
  gold: 160,
  offers: [
    ware('eagle_of_zeus', 150),
    ware('temple_serpent', 190),
    {
      kind: 'leave',
      itemId: '',
      name: 'Leave',
      description: '',
      level: 1,
      maxLevel: 1,
      sprite: 'merchant',
      color: 0,
    },
  ],
};

describe('LevelUpDialog as the shop (spec: merchant / the shop)', () => {
  it('shows the merchant, the party gold and prices, and cannot buy what is too dear', () => {
    const fixture = TestBed.createComponent(LevelUpDialog);
    fixture.componentRef.setInput('choice', shop);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const picked: number[] = [];
    fixture.componentInstance.chosen.subscribe((i) => picked.push(i));

    expect(el.querySelector('h2')?.textContent).toContain('The Wandering Merchant');
    expect(el.querySelector('[data-testid=shop-gold]')?.textContent).toContain('160');
    const offers = [...el.querySelectorAll<HTMLButtonElement>('[data-testid^=offer-]')];
    expect(offers[0].textContent).toContain('150');
    expect(offers[0].disabled).toBe(false);
    expect(offers[1].disabled).toBe(true);
    expect(offers[2].textContent).toContain('Leave');
    offers[2].click();
    expect(picked).toEqual([2]);
  });
});
