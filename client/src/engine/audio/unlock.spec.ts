import { unlockOnGesture } from './unlock';

/** A context that stays suspended for the first `refusals` resumes, as a browser does before a counted gesture. */
function fakeContext(refusals: number) {
  const ctx = {
    state: 'suspended' as AudioContextState,
    resumes: 0,
    resume() {
      ctx.resumes++;
      if (ctx.resumes > refusals) ctx.state = 'running';
      return Promise.resolve();
    },
  };
  return ctx;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('unlocking audio (spec: music / the hall theme)', () => {
  it('keeps trying past a gesture the browser does not count, then stops listening', async () => {
    const ctx = fakeContext(1);
    unlockOnGesture(ctx as unknown as AudioContext);
    // A finger touching down: not counted.
    window.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(ctx.state).toBe('suspended');
    // It lifts: counted.
    window.dispatchEvent(new Event('touchend'));
    await flush();
    expect(ctx.state).toBe('running');
    window.dispatchEvent(new Event('click'));
    await flush();
    expect(ctx.resumes).toBe(2);
  });

  it('leaves the context asleep while sound is not wanted', async () => {
    const ctx = fakeContext(0);
    let wanted = false;
    unlockOnGesture(ctx as unknown as AudioContext, () => wanted);
    window.dispatchEvent(new Event('keydown'));
    await flush();
    expect(ctx.resumes).toBe(0);
    wanted = true;
    window.dispatchEvent(new Event('keydown'));
    await flush();
    expect(ctx.state).toBe('running');
  });
});
