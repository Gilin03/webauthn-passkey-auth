import { whatILike } from '@/data/portfolio';

export default function WhatILike() {
  return (
    <section id="like" className="bg-cream-100/60 px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto w-full max-w-6xl">
        {/* 헤더 */}
        <div>
          <p className="font-mono text-xs font-medium tracking-widest text-teal-500">
            {whatILike.label}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl">
            {whatILike.title}
          </h2>
        </div>

        {/* 카드 2열 */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {whatILike.items.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.name}
                className="flex flex-col rounded-2xl border border-cream-300 bg-cream-50 p-8 transition-colors duration-200 hover:border-teal-400/50 sm:p-10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-cream-50">
                  <Icon className="h-7 w-7" strokeWidth={2} />
                </div>

                <h3 className="mt-6 text-2xl font-semibold text-navy-800">
                  {item.name}
                </h3>

                <p className="mt-3 text-base leading-relaxed text-navy-700">
                  {item.description}
                </p>

                {/* 키워드 */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {item.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-cream-300 bg-cream-100 px-3.5 py-1.5 text-sm font-medium text-navy-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
