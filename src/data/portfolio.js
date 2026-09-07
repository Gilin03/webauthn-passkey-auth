import { Puzzle, Users, Compass, Monitor, Gamepad2, Award, Link2 } from 'lucide-react';

export const profile = {
  name: '김태빈',
  intro: 'IT 분야를 배우며 새로운 것을 직접 경험하고 문제를 해결해 나가는 사람입니다.',
};

export const heroAbout = {
  label: 'ABOUT / 01',
  name: '김태빈',
  tagline: '배우고 익히며, 상황에 맞게 함께 해결하고,\n직접 찾아보고 실행하는 사람.',
  audienceLabel: 'FOR IT RECRUITERS',
  audienceDescription:
    '이 페이지는 IT분야 채용담당에게 제가 무엇을 배우고, 어떤 상황에서 문제를 해결하고 실행했는지를 보여주기 위한 것이다',
  scope: '공개 범위 · ABOUT · WHAT I DID · WHAT I LIKE',
};

export const heroEvidence = {
  label: 'EVIDENCE / 01',
  title: '근거',
  value: '네트워크관리사 2급\n필기 합격',
  note: '직접 공부하고 합격',
};

export const about = {
  title: 'ABOUT',
  subtitle: '나는 어떤 사람인가',
  paragraphs: [
    'IT 분야를 배우며, 새로운 것을 직접 경험하고 문제를 해결해 나가는 것을 좋아합니다.',
    '배운 내용을 그냥 넘기지 않고, 직접 시도해 보며 스스로 답을 찾는 과정을 중요하게 생각합니다.',
    '아직 준비 중인 과정이지만, 앞으로 더 많은 경험을 쌓아가려 합니다.',
  ],
};

export const whatIDid = {
  label: 'WHAT I DID / 02',
  title: '말보다, 했던 일.',
  subtitle: '작은 상황을 읽고 필요한 일을 직접 했습니다.',
  description: '',
  cards: [
    {
      index: '01',
      title: '네트워크관리사 2급 필기 준비',
      description: '어려운 개념은 질문하고, 기출문제로 반복하며 합격까지 이어갔습니다.',
      shortActivity: '네트워크관리사 2급 필기 준비',
      tag: '배우고 익히는 편',
      situation: '네트워크관리사 2급 필기시험을 준비하며 네트워크 관련 개념을 공부해야 했다.',
      action: '이해하기 어려운 개념은 직접 찾아보고 질문하며 정리했고, 기출문제를 반복해서 풀면서 부족한 부분을 확인했다.',
      result: '부족한 개념을 보완하면서 네트워크관리사 2급 필기시험에 합격했다.',
      icon: Puzzle,
      evidence: { label: 'EVIDENCE', value: '네트워크관리사 2급 필기 합격' },
    },
    {
      index: '02',
      title: '주문이 몰리는 순간의 협업',
      description: '주문이 몰리는 상황에서 역할을 나누고, 서로의 업무가 막히지 않도록 함께 처리했습니다.',
      shortActivity: '신입 크루와 업무를 나눠 주문 처리',
      tag: '상황에 맞게 함께 해결하는 편',
      situation: '주문이 몰리는 상황에서 신입 크루가 패티와 후라이 업무를 혼자 처리하는 데 어려움을 겪었다.',
      action: '신입 크루는 후라이 업무에 집중하도록 하고, 나는 패티와 드레싱 업무를 맡아 역할을 나눴다.',
      result: '각자 맡은 업무에 집중하면서 몰린 주문을 함께 처리할 수 있었다.',
      icon: Users,
    },
    {
      index: '03',
      title: '원하는 환경의 컴퓨터 구성',
      description: '예산과 모니터 해상도를 기준으로 부품을 비교하고, 필요한 구성으로 직접 컴퓨터를 맞췄습니다.',
      shortActivity: '예산과 모니터 해상도에 맞춰 PC 직접 구성',
      tag: '직접 찾아보고 실행하는 편',
      situation: '정해진 예산 안에서 사용하려는 모니터 해상도에 맞는 컴퓨터를 직접 구성해야 했다.',
      action: '예산과 모니터 해상도를 기준으로 필요한 부품을 정하고, 각 부품을 하나씩 직접 찾아 성능과 가격을 비교하며 선택했다. 여러 곳에서 부품을 나누어 구매하며 전체 구성을 맞췄다.',
      result: '정해진 예산 안에서 원하는 모니터 환경에 맞는 컴퓨터를 직접 구성할 수 있었다.',
      icon: Compass,
    },
  ],
};

export const whatILike = {
  label: 'WHAT I LIKE / 03',
  title: '관심이 향하는 곳.',
  subtitle: '',
  items: [
    {
      name: '컴퓨터',
      description:
        '예산과 모니터 해상도에 맞는 부품을 비교하고, 직접 컴퓨터를 구성하며 새로운 도구와 시스템을 알아가는 것을 좋아합니다.',
      keywords: ['탐색', '비교', '구성'],
      icon: Monitor,
    },
    {
      name: '게임',
      description:
        '게임을 즐기면서 게임이 어떻게 구성되어 있는지, 새로운 시스템이 어떻게 작동하는지 살펴보는 것을 좋아합니다.',
      keywords: ['탐색', '이해', '경험'],
      icon: Gamepad2,
    },
  ],
};

export const evidence = {
  label: 'EVIDENCE',
  title: '상세 근거 기록',
  iconAward: Award,
  iconLink: Link2,
};
