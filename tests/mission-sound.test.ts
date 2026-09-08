import test from 'node:test';
import assert from 'node:assert/strict';
import { MissionSound } from '../lib/mission-sound.ts';

// Exercise user-visible transport behavior without browser autoplay or real audio output.
function harness() {
  const original = {
    Audio: globalThis.Audio,
    request: globalThis.requestAnimationFrame,
    cancel: globalThis.cancelAnimationFrame,
  };
  const elements: FakeAudio[] = [];
  const callbacks = new Map<number, FrameRequestCallback>();
  let next = 0;
  class FakeAudio {
    currentTime = 0;
    volume = 1;
    muted = false;
    paused = true;
    loop = false;
    preload = '';
    error: unknown = null;
    failPlay = false;
    starts = 0;
    loaded = false;
    listeners = new Map<string, () => void>();
    src: string;
    constructor(src: string) {
      this.src = src;
      elements.push(this);
    }
    addEventListener(name: string, fn: () => void) {
      this.listeners.set(name, fn);
    }
    async play() {
      if (this.failPlay) throw new Error('Blocked');
      this.paused = false;
      this.starts++;
    }
    pause() {
      this.paused = true;
    }
    load() {
      this.loaded = true;
      this.error = null;
    }
    removeAttribute() {
      this.src = '';
    }
  }
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.requestAnimationFrame = (fn) => {
    callbacks.set(++next, fn);
    return next;
  };
  globalThis.cancelAnimationFrame = (id) => {
    callbacks.delete(id);
  };
  const sound = new MissionSound();
  const advance = (ms: number) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((fn) => fn(ms));
  };
  const restore = () => {
    sound.dispose();
    globalThis.Audio = original.Audio;
    globalThis.requestAnimationFrame = original.request;
    globalThis.cancelAnimationFrame = original.cancel;
  };
  return { sound, elements, advance, restore };
}

void test('intro pause preserves the narration clock; skipping stops speech across later resumes', async () => {
  const h = harness();
  try {
    h.sound.start();
    await Promise.resolve();
    assert.ok(h.elements.every((a) => !a.paused));
    h.elements[0].currentTime = 17.5;
    h.sound.pause(true);
    assert.ok(h.elements.every((a) => a.paused));
    assert.equal(h.sound.time, 17.5);
    h.sound.pause(false);
    await Promise.resolve();
    assert.equal(h.elements[0].currentTime, 17.5);
    h.sound.enter();
    h.sound.pause(true);
    h.sound.pause(false);
    await Promise.resolve();
    assert.equal(h.elements[0].paused, true);
    assert.equal(h.elements[1].paused, false);
  } finally {
    h.restore();
  }
});

void test('release restarts the dramatic cue; repeated frame updates do not rewind it', () => {
  const h = harness();
  try {
    h.sound.start();
    h.elements[2].currentTime = 53;
    h.sound.setPhase('fall');
    assert.equal(h.elements[2].currentTime, 0);
    h.elements[2].currentTime = 7;
    h.sound.setPhase('fall');
    assert.equal(h.elements[2].currentTime, 7);
    h.sound.setPhase('hold');
    h.sound.setPhase('fall');
    assert.equal(h.elements[2].currentTime, 0);
  } finally {
    h.restore();
  }
});

void test('voice and score mute independently without stopping the editorial clock', () => {
  const h = harness();
  try {
    h.sound.start();
    h.sound.voiceEnabled = false;
    h.elements[0].currentTime = 11;
    h.advance(1000);
    assert.equal(h.elements[0].muted, true);
    assert.equal(h.elements[1].muted, false);
    assert.equal(h.sound.time, 11);
    h.sound.musicEnabled = false;
    h.advance(1100);
    assert.equal(h.elements[1].muted, true);
    assert.equal(h.elements[2].muted, true);
    assert.equal(h.elements[0].paused, false);
  } finally {
    h.restore();
  }
});

void test('a rejected voice channel keeps a text timeline and reports a retryable failure', async () => {
  const h = harness();
  try {
    h.elements[0].failPlay = true;
    h.sound.start();
    await Promise.resolve();
    await Promise.resolve();
    assert.ok(h.sound.failed.has('voice'));
    h.advance(1000);
    h.advance(1100);
    h.advance(1200);
    assert.ok(h.sound.time > 0);
    h.sound.pause(true);
    const time = h.sound.time;
    h.advance(1300);
    assert.equal(h.sound.time, time);
    h.elements[0].failPlay = false;
    h.sound.pause(false);
    h.sound.retry();
    await Promise.resolve();
    assert.equal(h.sound.failed.has('voice'), false);
    assert.equal(h.sound.time, time);
  } finally {
    h.restore();
  }
});
