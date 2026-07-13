import { Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  sampleTranscript: string;
  onUseTranscript?: (text: string) => void;
};

/** UI-only private voice capture. Nothing leaves this device in the mock. */
export function PrivateVoiceCapture({ sampleTranscript, onUseTranscript }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!listening) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTranscript(sampleTranscript);
      setListening(false);
      onUseTranscript?.(sampleTranscript);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [listening, onUseTranscript, sampleTranscript]);

  return (
    <div className="app-card grid gap-4 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-border/80 bg-mist/60">
        <Mic className={`text-fgMuted ${listening ? 'animate-pulse' : ''}`} size={26} strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-medium text-fg">Private voice — this device only</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fgMuted">
          Not public. Not shared. Say the meal however you say it — bhagara rice, sarakha kura, “I was tired.”
          We’ll turn it into a draft you can review.
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
        >
          {listening ? 'Listening…' : 'Hold a soft note'}
        </button>
      ) : (
        <div className="grid gap-3 text-left">
          <p className="rounded-2xl border border-border/70 bg-mist/40 px-4 py-3 text-sm leading-relaxed text-fg">
            “{transcript}”
          </p>
          <p className="text-xs text-fgMuted">Stayed on this laptop / phone. Nothing uploaded in this preview.</p>
          <Link className="button-primary" to="/log/meal/confirm">
            Look it over with me
          </Link>
          <button className="button-secondary" type="button" onClick={() => setTranscript('')}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
