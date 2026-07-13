type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function isWebSpeechAvailable() {
  const w = window as SpeechWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenOnce(options?: { lang?: string; timeoutMs?: number }): Promise<string> {
  const w = window as SpeechWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    return Promise.reject(new Error('Voice typing is not available in this browser.'));
  }

  const timeoutMs = options?.timeoutMs ?? 10000;

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = options?.lang ?? 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      fn();
    };

    const timer = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      finish(() => reject(new Error('Listening timed out — try again or type instead.')));
    }, timeoutMs);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
      finish(() => (transcript ? resolve(transcript) : reject(new Error('No speech heard.'))));
    };

    recognition.onerror = (event) => {
      finish(() => reject(new Error(event.error || 'Voice typing failed.')));
    };

    recognition.onend = () => {
      finish(() => reject(new Error('Listening ended before we caught a phrase.')));
    };

    try {
      recognition.start();
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error('Could not start microphone.')));
    }
  });
}
