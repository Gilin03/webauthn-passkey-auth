import { ArrowUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-cream-300 px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <p className="font-mono text-xs font-medium tracking-widest text-navy-700/50">
          TB / PORTFOLIO
        </p>
        <a
          href="#top"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 transition-colors hover:text-teal-500 focus:outline-none focus-visible:text-teal-500 focus-visible:underline focus-visible:underline-offset-4"
        >
          처음으로
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      </div>
    </footer>
  );
}
