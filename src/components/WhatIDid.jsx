import { useState } from 'react';
import { whatIDid } from '@/data/portfolio';
import { Award, ChevronDown } from 'lucide-react';

export default function WhatIDid() {
  const [openSet, setOpenSet] = useState(new Set());

  const toggle = (i) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id="did" className="px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto w-full max-w-6xl">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium tracking-widest text-teal-500">
              {whatIDid.label}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl">
              {whatIDid.title}
            </h2>
          </div>
          <p className="max-w-xs whitespace-pre-line text-sm leading-relaxed text-navy-700 sm:text-right">
            {whatIDid.subtitle}
          </p>
        </div>

        {/* 카드 3열 */}
        <div className="mt-12 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {whatIDid.cards.map((card, i) => {
            const Icon = card.icon;
            const isOpen = openSet.has(i);
            return (
              <article
                key={card.index}
                className="flex flex-col rounded-2xl border border-cream-300 bg-cream-50 p-6 transition-colors duration-200 hover:border-teal-400/50 sm:p-7"
              >
                {/* 인덱스 + 아이콘 */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium tracking-widest text-navy-700/40">
                    {card.index}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-cream-50">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                </div>

                {/* 태그 */}
                <p className="mt-5 inline-flex w-fit rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-600">
                  {card.tag}
                </p>

                {/* 제목 */}
                <h3 className="mt-3 text-lg font-semibold leading-snug text-navy-800">
                  {card.title}
                </h3>

                {/* 짧은 설명 */}
                <p className="mt-2 text-sm leading-relaxed text-navy-700">
                  {card.description}
                </p>

                {/* 자세히 보기 버튼 */}
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`detail-${i}`}
                  className="mt-4 flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-navy-700 transition-colors hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                >
                  {isOpen ? '접기' : '자세히 보기'}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                  />
                </button>

                {/* 상세 내용 — 독립적으로 펼쳐짐 */}
                {isOpen && (
                  <dl
                    id={`detail-${i}`}
                    className="mt-4 space-y-3 border-t border-cream-300 pt-4"
                  >
                    <SARItem term="상황" text={card.situation} />
                    <SARItem term="행동" text={card.action} />
                    <SARItem term="결과" text={card.result} />
                  </dl>
                )}

                {/* Evidence 배지 — 첫 번째 경험 */}
                {card.evidence && (
                  <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400">
                      <Award className="h-3 w-3 text-navy-800" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold tracking-wide text-amber-600">
                        {card.evidence.label}
                      </p>
                      <p className="truncate text-xs text-navy-700">
                        {card.evidence.value}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SARItem({ term, text }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-xs font-semibold text-teal-500">{term}</dt>
      <dd className="text-xs leading-relaxed text-navy-700">{text}</dd>
    </div>
  );
}
