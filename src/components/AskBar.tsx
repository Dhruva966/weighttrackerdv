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

    // UI-only: show a sample answer card. Wiring comes later.
    setAnswer(uiMock.askDemo.answer);
  }

  return (
    <section className="sticky top-[4.5rem] z-20 border-b border-border bg-bg/95 px-5 py-3 backdrop-blur-sm">
      <form className="mx-auto max-w-xl" onSubmit={handleSubmit}>
        <label className="relative block">
          <span className="sr-only">Ask anything</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fgMuted" size={18} />
          <input
            className="field pl-11 text-base"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (answer) {
                setAnswer(null);
              }
            }}
            placeholder="Ask anything — weight, meals, lifts…"
          />
        </label>
      </form>

      {!answer ? (
        <div className="mx-auto mt-2 flex max-w-xl gap-2 overflow-x-auto pb-1">
          {uiMock.askExamples.map((example) => (
            <button
              key={example}
              type="button"
              className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-fgMuted hover:border-fg/20 hover:text-fg"
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
        <div className="mx-auto mt-3 max-w-xl rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-fgMuted">Answer</p>
          <p className="mt-1 text-editorial text-fg">{answer}</p>
          <button className="text-link mt-2" type="button" onClick={() => setAnswer(null)}>
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
