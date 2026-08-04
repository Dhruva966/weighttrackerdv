import { Mic } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  sampleTranscript: string;
  onConfirm: (text: string) => void;
};

/** UI-only private voice capture. Nothing leaves this device in the mock. */
export function PrivateVoiceCapture({ sampleTranscript, onConfirm }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!listening) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTranscript(sampleTranscript);
      setListening(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [listening, sampleTranscript]);

  return (
    <div className="app-card grid gap-4 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-border/80 bg-mist/60">
        <Mic className={`text-fgMuted ${listening ? 'animate-pulse' : ''}`} size={26} strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-medium text-fg">Private voice — this device only</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fgMuted">
          Not public. Not shared. Tap to run a soft demo note — bhagara rice, sarakha kura, “I was tired.”
        </p>
      </div>

      {!transcript ? (
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            setTranscript('');
            setListening(true);
          }}
          disabled={listening}
          aria-label={listening ? 'Listening' : 'Tap to speak (demo)'}
        >
          {listening ? 'Listening…' : 'Tap to speak (demo)'}
        </button>
      ) : (
        <div className="grid gap-3 text-left">
          <p className="rounded-2xl border border-border/70 bg-mist/40 px-4 py-3 text-sm leading-relaxed text-fg">
            “{transcript}”
          </p>
          <p className="text-xs text-fgMuted">Stayed on this device. Nothing uploaded in this preview.</p>
          <button className="button-primary" type="button" onClick={() => onConfirm(transcript)}>
            Look it over with me
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setTranscript('')}
            aria-label="Try voice capture again"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
