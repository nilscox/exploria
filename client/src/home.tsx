import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ArrowRight,
  Bot,
  DraftingCompass,
  Drama,
  FileText,
  History,
  type LucideIcon,
  Mail,
  MessageCircleQuestion,
  Network,
  Search,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { LinkButton } from 'src/components/button';
import { DocumentTitle } from 'src/components/document-title';
import { setLanguage } from 'src/i18n/i18n';

export function Home() {
  return (
    <div className="min-h-full">
      <DocumentTitle />
      <Hero />
      <Tension />
      <Pillars />
      <UseCases />
      <Features />
      <ClosingCta />
      <Footer />
    </div>
  );
}

const darkBand = 'bg-[radial-gradient(120%_120%_at_50%_0%,#2a2723_0%,#171717_55%)] text-orange-100';

function Hero() {
  return (
    <header className={darkBand}>
      <div className="mx-auto max-w-4xl px-8">
        <nav className="row h-16 items-center justify-between">
          <Link to="/" className="rounded-md px-2 text-lg font-bold">
            Explor<span className="text-amber-400">ia</span>
          </Link>
          <LanguageSelect />
        </nav>

        <div className="col items-center py-20 text-center">
          <div className="font-mono text-xs tracking-[0.14em] text-amber-400/90 uppercase">
            <Trans>Thinking assistant</Trans>
          </div>

          <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <Trans>
              Exploria thinks <span className="text-amber-400">with you</span>,
              <br />
              not for you.
            </Trans>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-orange-100/70">
            <Trans>
              A thinking assistant that asks the right questions, surfaces your blind spots, and structures your
              reflection.
            </Trans>
          </p>

          <div className="col mx-auto mt-9 w-fit items-start gap-4">
            <div className="row flex-wrap gap-3">
              <LinkButton to="/session" size="large">
                <Trans>Start a session</Trans>
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>

              <Link
                to={{ hash: '#how' }}
                onClick={() => document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })}
                className="row h-10 items-center rounded-lg border border-orange-100/25 px-6 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-100/50"
              >
                <Trans>Learn more</Trans>
              </Link>
            </div>

            <p className="text-left text-sm text-orange-100/50">
              <Trans>Free, no signup needed.</Trans>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function LanguageSelect() {
  const { i18n } = useLingui();

  return (
    <select
      aria-label="Language"
      value={i18n.locale}
      onChange={(event) => void setLanguage(i18n, event.target.value as Shared.Language)}
      className="cursor-pointer rounded-md border border-orange-100/25 bg-stone-800 px-2.5 py-1.5 text-sm text-orange-100/80 scheme-dark transition-colors hover:bg-stone-900"
    >
      <option value="en">🇺🇸 English</option>
      <option value="fr">🇫🇷 Français</option>
    </select>
  );
}

function Tension() {
  return (
    <section className="bg-[#1c1917] text-orange-100">
      <div className="mx-auto h-px max-w-5xl bg-linear-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_2px_rgba(251,191,36,0.5)]" />
      <div className="mx-auto max-w-4xl py-16">
        <p className="mx-auto my-4 max-w-xl text-2xl leading-snug tracking-tight text-orange-100/85">
          <Trans>
            Alone with a decision that matters, you quickly go in circles. You latch onto one option, dodge the awkward
            questions, miss whole angles.
          </Trans>
        </p>
        <p className="mx-auto my-4 max-w-xl text-2xl leading-snug tracking-tight text-orange-100/85">
          <Trans>
            What's often missing is <span className="text-amber-400">someone to ask the right questions</span>.
          </Trans>
        </p>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section id="how" className="mx-auto max-w-4xl px-8 py-20">
      <Pillar icon={MessageCircleQuestion} title={<Trans>Questions, not answers</Trans>}>
        <Trans>
          Exploria probes your reasoning and names the biases that distort it, so you move forward on your own.
        </Trans>
      </Pillar>
      <Pillar icon={Drama} title={<Trans>The right angle at the right moment</Trans>}>
        <Trans>Devil's advocate, listening, pushback: it adjusts its stance to what your thinking needs.</Trans>
      </Pillar>
      <Pillar icon={Network} title={<Trans>Your thinking, structured</Trans>}>
        <Trans>
          As the conversation unfolds, a mind map takes shape: the topics covered, their links, what's left to explore.
          At a glance, you know where you stand.
        </Trans>
      </Pillar>
      <Pillar icon={DraftingCompass} soon title={<Trans>A method, not just a conversation</Trans>}>
        <Trans>
          Pre-mortem, inversion, opportunity cost… it draws on proven thinking methods, matched to your situation.
        </Trans>
      </Pillar>
    </section>
  );
}

function Pillar({
  icon: Icon,
  title,
  soon,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  soon?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="row border-border gap-6 border-t py-7 last:border-b">
      <div className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <h3 className="row flex-wrap items-center gap-2.5 text-lg font-semibold tracking-tight">
          {title}
          {soon && <Soon />}
        </h3>
        <p className="text-dim mt-1.5 max-w-prose">{children}</p>
      </div>
    </div>
  );
}

function Soon() {
  return (
    <span className="border-primary text-primary rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase">
      <Trans>Coming soon</Trans>
    </span>
  );
}

function UseCases() {
  return (
    <section className="bg-accent">
      <div className="mx-auto max-w-4xl px-8 py-20">
        <h2 className="mx-auto mb-9 max-w-[22em] text-center text-2xl font-semibold tracking-tight">
          <Trans>For the decisions and questions worth pausing on.</Trans>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <UseCase title={<Trans>Make a structuring decision</Trans>}>
            <Trans>A career move, a pivot, a commitment that stays with you.</Trans>
          </UseCase>
          <UseCase title={<Trans>Frame a research problem</Trans>}>
            <Trans>A subject you don't know which way to approach.</Trans>
          </UseCase>
          <UseCase title={<Trans>Test a belief</Trans>}>
            <Trans>A conviction you take for granted: what if you really examined it?</Trans>
          </UseCase>
          <UseCase title={<Trans>Stress-test an idea</Trans>}>
            <Trans>An argument or hypothesis to solidify before you defend it.</Trans>
          </UseCase>
        </div>
      </div>
    </section>
  );
}

function UseCase({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="border-border border-l-primary bg-neutral rounded-xl border border-l-[3px] p-5">
      <h4 className="font-medium">{title}</h4>
      <p className="text-dim mt-1.5 text-sm">{children}</p>
    </div>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-4xl px-8 py-20">
      <div className="text-primary mb-10 text-center font-mono text-xs tracking-[0.08em] uppercase">
        <Trans>Beyond the conversation</Trans>
      </div>
      <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 md:grid-cols-3">
        <Feature icon={FileText} title={<Trans>Exportable summary</Trans>}>
          <Trans>Leave with a clear write-up, ready to reread or share.</Trans>
        </Feature>
        <Feature icon={History} title={<Trans>History</Trans>}>
          <Trans>All your past sessions, to pick up whenever you want.</Trans>
        </Feature>
        <Feature icon={Bot} title={<Trans>Model choice</Trans>}>
          <Trans>Work with the AI model that suits you.</Trans>
        </Feature>
        <Feature icon={Timer} title={<Trans>Timebox</Trans>}>
          <Trans>Give your thinking a time frame.</Trans>
        </Feature>
        <Feature icon={Search} title={<Trans>Web search</Trans>}>
          <Trans>Ground your reflection in facts, when it helps.</Trans>
        </Feature>
        <Feature icon={Mail} title={<Trans>Your ideas</Trans>}>
          <Trans>
            A feature in mind?{' '}
            <a href="mailto:nilscox.dev@gmail.com" className="hover:text-amber-600">
              Tell us about it
            </a>
            .
          </Trans>
        </Feature>
      </div>
    </section>
  );
}

function Feature({ icon: Icon, title, children }: { icon: LucideIcon; title: ReactNode; children: ReactNode }) {
  return (
    <div className="row gap-3.5">
      <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-[10px]">
        <Icon className="size-6" aria-hidden />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-dim text-sm leading-snug">{children}</p>
      </div>
    </div>
  );
}

function ClosingCta() {
  return (
    <section className="bg-[radial-gradient(120%_120%_at_50%_100%,#2a2723_0%,#171717_55%)] text-orange-100">
      <div className="mx-auto max-w-xl px-8 py-20 text-center">
        <p className="mb-8 text-2xl tracking-tight text-orange-100/90">
          <Trans>Start whenever you want. One session is enough to see if it speaks to you.</Trans>
        </p>
        <div className="row justify-center">
          <LinkButton to="/session" size="large">
            <Trans>Start a session</Trans>
            <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#171717] text-orange-100/50">
      <div className="row mx-auto max-w-4xl items-center justify-between px-8 py-6 text-sm">
        <span>Exploria</span>
        <div className="row items-center gap-5">
          <span>
            <Trans>Think, better.</Trans>
          </span>
          <a
            href="https://github.com/nilscox/exploria"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <img src="https://cdn.simpleicons.org/github/gray?viewbox=auto" alt="" aria-hidden className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
