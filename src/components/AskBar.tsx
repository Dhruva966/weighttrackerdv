import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { uiMock } from '../data/uiMock';

export function AskBar() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    setAnswer(uiMock.askDemo.answer);
  }

  return (
    <section className="sticky top-[4.5rem] z-20 border-b border-border/70 bg-bg/90 px-5 py-3.5 backdrop-blur-md">
      <form className="mx-auto max-w-xl" onSubmit={handleSubmit}>
        <label className="relative block">
          <span className="sr-only">Ask anything</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fgMuted"
            size={18}
            strokeWidth={1.5}
          />
          <input
            className="field border-border/60 bg-surface/90 pl-11 text-base shadow-card"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (answer) {
                setAnswer(null);
              }
            }}
            placeholder="Ask how you’re doing — weight, meals, lifts…"
          />
        </label>
      </form>

      {!answer ? (
        <div className="mx-auto mt-2.5 flex max-w-xl gap-2 overflow-x-auto pb-1">
          {uiMock.askExamples.map((example) => (
            <button
              key={example}
              type="button"
              className="quiet-chip"
              onClick={() => {
                setQuery(example);
                setAnswer(uiMock.askDemo.answer);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-3 max-w-xl rounded-2xl border border-accent/15 bg-accentSoft/80 px-4 py-3.5 shadow-card">
          <p className="text-xs tracking-wide text-fgMuted">Here’s a kind read</p>
          <p className="mt-1.5 text-editorial text-fg">{answer}</p>
          <button className="text-link mt-2" type="button" onClick={() => setAnswer(null)}>
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
