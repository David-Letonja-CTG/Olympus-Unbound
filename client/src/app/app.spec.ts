import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it("blocks Safari's pinch zoom everywhere (owner's choice: a game, not a page)", () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.createComponent(App);
    for (const type of ['gesturestart', 'gesturechange']) {
      const event = new Event(type, { cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });
});
