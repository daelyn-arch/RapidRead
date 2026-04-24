import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuth } from '@/auth/useAuth';

const DEMO_TEXT =
  "She scanned the words faster than she thought possible, as if the page itself were reading her. " +
  "Each syllable pinned into place, one by one, building meaning without effort.";

function ORPWord({ word }: { word: string }) {
  // Pick the Optimal Recognition Point, a visual anchor slightly left of center.
  const orp = Math.min(word.length - 1, Math.max(0, Math.floor(word.length / 2) - 1));
  return (
    <span className="tabular-nums font-mono">
      <span>{word.slice(0, orp)}</span>
      <span style={{ color: 'var(--orp-color)' }}>{word[orp] ?? ''}</span>
      <span>{word.slice(orp + 1)}</span>
    </span>
  );
}

function RSVPDemo() {
  const words = useMemo(() => DEMO_TEXT.split(/\s+/).filter(Boolean), []);
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % words.length), 220);
    return () => window.clearInterval(id);
  }, [words.length]);

  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    >
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
        Live demo — 275 wpm
      </div>
      <div className="text-4xl sm:text-5xl font-semibold h-16 flex items-center justify-center">
        <ORPWord word={words[i]} />
      </div>
      <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        One word at a time. No scrolling. No eye jitter.
      </div>
    </div>
  );
}

const features = [
  {
    title: 'Context-aware pacing',
    body: 'Slows down for dialogue, names, and unfamiliar words. Keeps cruising through the easy stuff.',
  },
  {
    title: 'Works offline, installable',
    body: 'Progressive web app. Install to your dock, read on a plane, keep going.',
  },
  {
    title: 'Cloud library sync',
    body: 'Start on your laptop, pick up on your phone. Your books, bookmarks, and progress travel with you.',
    pro: true,
  },
] as const;

const faqs = [
  {
    q: 'Is my data private?',
    a: 'Yes. Books live in your browser by default. If you turn on Pro cloud sync, they go to your private account on Supabase. We do not sell data.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. One click from your account page. You keep Pro access until the end of the billing period.',
  },
  {
    q: 'Do I own my books?',
    a: 'Of course. You import your own EPUB or TXT files. We do not sell or lend any titles.',
  },
  {
    q: 'What formats are supported?',
    a: 'EPUB and TXT today. PDF is on the roadmap.',
  },
  {
    q: 'What about refunds?',
    a: 'Email support within 7 days and we will refund, no questions asked.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const hasLocalBooks = useLibraryStore((s) => s.books.length > 0);
  const { session } = useAuth();

  // Returning local user? Skip the marketing and jump into the app.
  // Also skip the landing page if the user is already signed in — otherwise
  // the post-email-verification redirect lands them here with no feedback.
  useEffect(() => {
    if (session || hasLocalBooks) navigate('/app', { replace: true });
  }, [session, hasLocalBooks, navigate]);

  return (
    <div className="min-h-[100dvh] safe-top" style={{ color: 'var(--text-primary)' }}>
      <header className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
        <Link to="/" className="font-semibold tracking-tight">RapidRead</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            to="/pricing"
            className="hover:underline hidden sm:inline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="rounded-md px-3 py-1.5 border"
            style={{
              borderColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="rounded-md px-3 py-1.5 font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Try free
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="grid md:grid-cols-2 gap-10 py-10 md:py-16 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Read twice as fast.<br />
              Keep your books in sync.
            </h1>
            <p className="mt-5 text-lg" style={{ color: 'var(--text-secondary)' }}>
              RapidRead is a RSVP speed reader that slows down for the words that matter and sprints through the rest. Now with cloud library sync across every device.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="rounded-md px-5 py-3 font-medium"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Try free — no signup
              </Link>
              <Link
                to="/pricing"
                className="rounded-md px-5 py-3 font-medium border"
                style={{
                  borderColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              EPUB &amp; TXT supported · Works offline · Your books stay yours
            </p>
          </div>
          <RSVPDemo />
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-4 mt-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{f.title}</h3>
                {'pro' in f && f.pro && (
                  <span
                    className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    Pro
                  </span>
                )}
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{f.body}</p>
            </div>
          ))}
        </section>

        {/* Pricing teaser */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-semibold">Simple pricing</h2>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Free forever with Base Speed and colors. <strong style={{ color: 'var(--text-primary)' }}>$0.99/month</strong> or $7.99/year unlocks everything else. Cancel anytime.
          </p>
          <Link
            to="/pricing"
            className="inline-block mt-5 rounded-md px-5 py-3 font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            See full pricing
          </Link>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-center mb-6">Questions</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-20 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} RapidRead · <Link to="/pricing" className="underline">Pricing</Link> · <a className="underline" href="mailto:support@rapidread.app">Support</a>
        </footer>
      </main>
    </div>
  );
}
