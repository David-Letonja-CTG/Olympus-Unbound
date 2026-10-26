import { AdminServer, adminToken, adminUnlocked, sha256Hex, unlockAdmin } from './admin-mode';
import { ServerError } from './game-server';

/** A game server whose admin token is `token`; `status` answers instead when given. */
function server(token: string, status?: number): AdminServer & { calls: number } {
  return {
    configured: true,
    calls: 0,
    async post<T>(_path: string, _body: unknown, headers?: Record<string, string>): Promise<T> {
      this.calls++;
      if (status !== undefined) throw new ServerError(status);
      if (headers?.['authorization'] !== `Bearer ${token}`) throw new ServerError(401);
      return {} as T;
    },
  };
}

describe('admin mode (spec: run-statistics / admin mode)', () => {
  beforeEach(() => sessionStorage.clear());

  it('unlocks with the server’s admin token, and keeps it for the tab’s session', async () => {
    const s = server('the-admin-token');
    expect(await unlockAdmin('wrong', s)).toBe('wrong');
    expect(adminUnlocked()).toBe(false);
    expect(await unlockAdmin('the-admin-token', s)).toBe('ok');
    expect(adminUnlocked()).toBe(true);
    expect(adminToken()).toBe('the-admin-token');
  });

  it('says why the server could not unlock it', async () => {
    expect(await unlockAdmin('x', server('t', 429))).toBe('too-many');
    expect(await unlockAdmin('x', server('t', 404))).toBe('no-token');
    expect(await unlockAdmin('x', server('t', 0))).toBe('unreachable');
    expect(adminUnlocked()).toBe(false);
  });

  it('checks the build’s hash only in a build without a server', async () => {
    const hash = await sha256Hex('the right one');
    const none: AdminServer = { configured: false, post: async () => ({}) as never };
    expect(await unlockAdmin('wrong', none, hash)).toBe('wrong');
    expect(await unlockAdmin('', none, hash)).toBe('wrong');
    expect(await unlockAdmin('the right one', none, hash)).toBe('ok');
    expect(adminUnlocked()).toBe(true);
    expect(adminToken()).toBeUndefined();
  });

  it('hashes with SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
