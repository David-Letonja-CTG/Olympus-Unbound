import { adminUnlocked, sha256Hex, unlockAdmin } from './admin-mode';

describe('admin mode (spec: run-statistics / admin mode)', () => {
  beforeEach(() => sessionStorage.clear());

  it('unlocks only with the right password, for the tab’s session', async () => {
    const hash = await sha256Hex('the right one');
    expect(adminUnlocked()).toBe(false);
    expect(await unlockAdmin('wrong', hash)).toBe(false);
    expect(await unlockAdmin('', hash)).toBe(false);
    expect(adminUnlocked()).toBe(false);
    expect(await unlockAdmin('the right one', hash)).toBe(true);
    expect(adminUnlocked()).toBe(true);
  });

  it('hashes with SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
