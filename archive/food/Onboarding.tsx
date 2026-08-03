import { AnimatePresence, motion } from 'framer-motion';
import { Scale, Search, Utensils } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';

type Focus = 'meals' | 'weight' | 'both';

const steps = ['welcome', 'tour', 'you', 'ready'] as const;

const pillars = [
  {
    icon: Scale,
    title: 'A kind morning weigh-in',
    body: 'One number, no judgment — just a calm habit when you’re ready.',
  },
  {
    icon: Utensils,
    title: 'Meals in your words',
    body: 'Bhagara rice, sarakha kura, chai — describe the plate however you talk about it. Private voice stays on this device.',
  },
  {
    icon: Search,
    title: 'Motivation when you ask',
    body: 'Energy dips are real. Ask for a kind nudge — no sleep tracking unless you want it later.',
  },
] as const;

const focusOptions: { id: Focus; label: string; hint: string }[] = [
  { id: 'meals', label: 'Food first', hint: 'Logging plates and chai' },
  { id: 'weight', label: 'Weight first', hint: 'A steady morning check-in' },
  { id: 'both', label: 'A bit of both', hint: 'Most people start here' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useUiStore((state) => state.completeOnboarding);
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('Lift');
  const [focus, setFocus] = useState<Focus>('both');

  const step = steps[stepIndex];

  function finish() {
    completeOnboarding({ preferredName: name, focus });
    navigate('/', { replace: true });
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 pb-10 pt-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <p className="page-title text-[1.45rem] tracking-[-0.02em]">Lift</p>
        <p className="text-xs tracking-[0.14em] text-fgMuted uppercase">
          {stepIndex + 1} of {steps.length}
        </p>
      </div>

      <div className="mb-8 flex gap-1.5" aria-hidden>
        {steps.map((_, index) => (
          <span
            key={steps[index]}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= stepIndex ? 'bg-accent/70' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {step === 'welcome' ? (
            <section className="grid flex-1 content-start gap-5">
              <p className="text-sm text-fgMuted">A warm welcome</p>
              <h1 className="page-title text-[2rem]">You’re in the right place</h1>
              <p className="page-lead">
                Lift is a calm space for morning weight, home-cooked plates, and the occasional workout —
                without pressure to do it all at once.
              </p>
              <p className="text-editorial text-fgMuted">Showing up today already counts.</p>
            </section>
          ) : null}

          {step === 'tour' ? (
            <section className="grid flex-1 content-start gap-5">
              <p className="text-sm text-fgMuted">How Lift helps</p>
              <h1 className="page-title text-[2rem]">Three gentle habits</h1>
              <p className="page-lead">Nothing flashy — just a few ways to notice your day kindly.</p>
              <ul className="grid gap-3">
                {pillars.map((pillar) => (
                  <li key={pillar.title} className="app-card flex gap-3 !p-4">
                    <pillar.icon className="mt-0.5 shrink-0 text-fgMuted" size={20} strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-fg">{pillar.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-fgMuted">{pillar.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {step === 'you' ? (
            <section className="grid flex-1 content-start gap-5">
              <p className="text-sm text-fgMuted">About you</p>
              <h1 className="page-title text-[2rem]">What should we call you?</h1>
              <p className="page-lead">Optional — first name is plenty. Skip if you’d rather not.</p>
              <label className="grid gap-2">
                <span className="label">Name</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Lift"
                  autoComplete="given-name"
                />
              </label>
              <div className="grid gap-2">
                <p className="label">Where should we start soft?</p>
                {focusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFocus(option.id)}
                    className={`rounded-2xl border px-4 py-3.5 text-left transition ${
                      focus === option.id
                        ? 'border-accent/25 bg-accentSoft'
                        : 'border-border/80 bg-surface/80 hover:bg-mist/70'
                    }`}
                  >
                    <p className="font-medium text-fg">{option.label}</p>
                    <p className="mt-0.5 text-sm text-fgMuted">{option.hint}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 'ready' ? (
            <section className="grid flex-1 content-start gap-5">
              <p className="text-sm text-fgMuted">You’re ready</p>
              <h1 className="page-title text-[2rem]">
                {name.trim() ? `${name.trim()}, today’s waiting gently` : 'Today’s waiting gently'}
              </h1>
              <p className="page-lead">
                Log a meal when you’re hungry to write. Ask how you’re doing from the top bar. Gym can wait
                until your body asks for it.
              </p>
              <div className="rounded-2xl border border-border/80 bg-mist/40 px-5 py-5">
                <p className="text-editorial text-fg">
                  Be kind to yourself in this app — the same way you’d talk to someone you love.
                </p>
              </div>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 grid gap-2">
        {stepIndex < steps.length - 1 ? (
          <button className="button-primary" type="button" onClick={() => setStepIndex((value) => value + 1)}>
            Continue
          </button>
        ) : (
          <button className="button-primary" type="button" onClick={finish}>
            Start gently
          </button>
        )}
        {stepIndex > 0 && stepIndex < steps.length - 1 ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => setStepIndex((value) => value - 1)}
          >
            Back
          </button>
        ) : null}
        {stepIndex === 0 ? (
          <button className="text-link mx-auto mt-1" type="button" onClick={finish}>
            Skip for now
          </button>
        ) : null}
        {stepIndex === steps.length - 1 ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => setStepIndex((value) => value - 1)}
          >
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
