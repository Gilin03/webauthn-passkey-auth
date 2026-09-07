import { heroAbout, heroEvidence } from '@/data/portfolio';
import { Award } from 'lucide-react';

export default function Hero() {
  return (
    <section
      id="about"
      className="relative px-6 pt-8 pb-10 sm:px-10 sm:pt-10 sm:pb-12"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
          {/* 왼쪽 — ABOUT */}
          <div className="lg:col-span-3">
            <p className="font-mono text-xs font-medium tracking-widest text-teal-500">
              {heroAbout.label}
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-navy-800 sm:text-5xl lg:text-6xl">
              {heroAbout.name},
            </h1>
            <p className="mt-4 whitespace-pre-line text-xl leading-relaxed text-navy-700 sm:text-2xl">
              {heroAbout.tagline}
            </p>

            {/* 대상 표시 */}
            <div className="mt-8 border-l-2 border-teal-400 pl-4">
              <p className="font-mono text-xs font-semibold tracking-widest text-teal-500">
                {heroAbout.audienceLabel}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-700">
                {heroAbout.audienceDescription}
              </p>
            </div>

            {/* 공개 범위 */}
            <p className="mt-6 font-mono text-xs text-navy-700/50">
              {heroAbout.scope}
            </p>
          </div>

          {/* 오른쪽 — Evidence 카드 */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 p-7 sm:p-8">
              {/* 격자 배경 */}
              <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />

              <div className="relative">
                <p className="font-mono text-xs font-medium tracking-widest text-amber-600">
                  {heroEvidence.label}
                </p>
                <p className="mt-5 text-sm font-medium text-navy-700">
                  {heroEvidence.title}
                </p>
                <p className="mt-2 whitespace-pre-line text-2xl font-bold leading-snug text-navy-800 sm:text-3xl">
                  {heroEvidence.value}
                </p>

                {/* 체크 포인트 */}
                <div className="mt-6 flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400">
                    <Award className="h-3.5 w-3.5 text-navy-800" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm font-medium text-navy-700">
                    {heroEvidence.note}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
