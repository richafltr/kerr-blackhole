'use client';
import { useEffect, useRef, useState } from 'react';
const transmission = [
  {
    code: '01 / DESTINATION',
    title: 'A hundred million suns.',
    text: 'Vesper, this is flight control. The black hole fills your window. Your mission is to carry our instruments toward the horizon.',
  },
  {
    code: '02 / THE RETURN',
    title: 'Two crew. One return seat.',
    text: 'Mara is waiting aboard the carrier. The return seat can be hers. You can take Vesper down, or call off the descent. The decision is yours.',
  },
  {
    code: '03 / YOUR COMMAND',
    title: 'Nothing releases without you.',
    text: 'Enter the cabin. Arm the separation, then confirm release. The cameras at your lower right follow your descent. Your own clock stays with you.',
  },
];
export function MissionIntro({ onEnter }: { onEnter: () => void }) {
  const [page, setPage] = useState(-1),
    [sound, setSound] = useState(true),
    [voiceState, setVoiceState] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speak = (index: number, enabled = sound) => {
    if (!('speechSynthesis' in window)) {
      setVoiceState('TEXT CHANNEL');
      return;
    }
    window.speechSynthesis.cancel();
    if (!enabled || index < 0) {
      setVoiceState('TEXT CHANNEL');
      return;
    }
    const line = transmission[index];
    const speech = new SpeechSynthesisUtterance(`${line.title} ${line.text}`);
    const voices = window.speechSynthesis.getVoices();
    speech.voice =
      voices.find((v) => v.localService && /^en-GB/i.test(v.lang)) ??
      voices.find((v) => v.localService && /^en/i.test(v.lang)) ??
      null;
    speech.rate = 0.86;
    speech.pitch = 0.86;
    speech.volume = 0.85;
    speech.onstart = () => setVoiceState('VOICE CHANNEL');
    speech.onend = () => setVoiceState('TRANSMISSION COMPLETE');
    speech.onerror = () => setVoiceState('TEXT CHANNEL');
    utterance.current = speech;
    window.speechSynthesis.speak(speech);
  };
  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );
  const advance = () => {
    const next = page + 1;
    setPage(next);
    speak(next);
  };
  const enter = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    onEnter();
  };
  return (
    <section
      className={`mission-intro ${page < 0 ? 'title-sequence' : 'transmission-sequence'}`}
      aria-label="Mission entrance"
    >
      <div className="intro-meta">
        <span>VESPER / FLIGHT ARCHIVE</span>
        <span>08.09.26</span>
      </div>
      {page < 0 ? (
        <div className="title-lockup">
          <p className="intro-kicker">A JOURNEY TO THE EDGE OF WHAT WE KNOW</p>
          <h1>
            interstellar<span>: ad astra</span>
          </h1>
          <button className="intro-primary" onClick={advance}>
            BEGIN TRANSMISSION <span>↗</span>
          </button>
          <button className="intro-skip" onClick={enter}>
            ENTER WITHOUT BRIEFING
          </button>
        </div>
      ) : (
        <div className="transmission-card" key={page}>
          <div className="transmission-code">
            <span className="signal-light" />
            {transmission[page].code}
          </div>
          <h2>{transmission[page].title}</h2>
          <p>{transmission[page].text}</p>
          <div className="transmission-status">
            {voiceState || 'TEXT + VOICE'}
          </div>
          <button
            className="intro-primary"
            onClick={page === transmission.length - 1 ? enter : advance}
          >
            {page === transmission.length - 1 ? 'ENTER VESPER' : 'CONTINUE'}{' '}
            <span>↗</span>
          </button>
          <button className="intro-skip" onClick={enter}>
            SKIP TO CABIN
          </button>
        </div>
      )}
      <footer className="intro-footer">
        <span>CHAPTER I / THE RELEASE</span>
        <button
          aria-pressed={sound}
          onClick={() => {
            setSound(!sound);
            speak(page, !sound);
          }}
        >
          VOICE {sound ? 'ON' : 'OFF'}
        </button>
      </footer>
    </section>
  );
}
