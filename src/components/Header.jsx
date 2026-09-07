import { useEffect, useState } from 'react';

const navItems = [
  { label: 'ABOUT', href: '#about' },
  { label: 'WHAT I DID', href: '#did' },
  { label: 'WHAT I LIKE', href: '#like' },
  { label: 'PRIVATE', href: '#private' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-cream-300 bg-cream-50/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <a href="#top" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 font-mono text-sm font-bold text-cream-50">
            TB
          </span>
          <span className="text-sm font-semibold tracking-tight text-navy-800">
            김태빈
          </span>
        </a>

        <nav className="flex items-center gap-6 sm:gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs font-medium tracking-wide text-navy-700 transition-colors hover:text-teal-500 focus:outline-none focus-visible:text-teal-500 focus-visible:underline focus-visible:underline-offset-4"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
