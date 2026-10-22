import { serverUrlOf } from './game-server';

describe('the game server address (spec: game-server)', () => {
  it('is none, an address as given, or the site the game came from', () => {
    expect(serverUrlOf(undefined, 'https://olympus.example')).toBe('');
    expect(serverUrlOf('', 'https://olympus.example')).toBe('');
    expect(serverUrlOf('https://api.example/', 'https://olympus.example')).toBe(
      'https://api.example',
    );
    expect(serverUrlOf('same-origin', 'https://olympus.example')).toBe('https://olympus.example');
  });
});
