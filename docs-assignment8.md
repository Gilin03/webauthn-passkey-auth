# 과제 8 제출 설명서 초안

> 아래 문서는 실제 테스트 후 숫자/URL/응답을 채워 제출한다.
> 비공개 자료는 모두 가상 예시 데이터다.

## ① 무엇으로 붙였나

React/Vite 포트폴리오에 `@simplewebauthn/browser`를 사용해 브라우저 WebAuthn 흐름을 붙이고, Supabase Edge Function에서 `@simplewebauthn/server`로 등록/로그인 검증을 직접 구현했다.

데이터 저장소는 Supabase PostgreSQL을 사용했다. `portfolio_users`, `passkeys`, `webauthn_challenges`, `private_items`를 분리했고 브라우저에서 DB를 직접 조회하지 못하게 했다.

## ② 왜 이 방법을 골랐나

과제에서 요구한 핵심이 비밀번호 없는 인증이기 때문에 WebAuthn/passkey를 선택했다. 브라우저는 개인키를 관리하고 서버는 공개키만 저장할 수 있어 비밀번호 저장이 필요하지 않다.

Supabase는 데이터베이스와 Edge Function을 한 곳에서 운영할 수 있어 별도 Express 서버를 추가하지 않고 기존 포트폴리오에 연결하기 쉬웠다.

## ③ 어디를 어떻게 고쳤나

- 첫 등록: `src/components/PrivateArea.jsx` → `enroll-start` → `register-options` → `register-verify`
- 두 번째 등록: 인증된 세션 → `register-options` → `register-verify` (현재 계정에 추가)
- 로그인: `src/components/PrivateArea.jsx` → `auth-options` → `auth-verify`
- 로그아웃: `src/components/PrivateArea.jsx` → `logout`
- 비공개 자료 조회: `src/components/PrivateArea.jsx` → `private-items`
- 서버 검증: `supabase/functions/passkey-api/index.ts`
- DB: `portfolio_users`, `passkeys`, `webauthn_challenges`, `private_items`

## ④ 안 열리는 것을 확인한 기록

### 1) 로그인 없이 비공개 영역 직접 요청

성공해야 하는 요청: 공개 페이지 `GET /`
거절되어야 하는 요청: `GET /functions/v1/passkey-api?action=private-items`
결과: `401 authentication_required`

### 2) 남의 패스키로 다른 계정 자료 접근

A 인증 → B의 user_id 요청 → `403 forbidden_user_resource`
B 인증 → A의 user_id 요청 → `403 forbidden_user_resource`

### 3) challenge 재사용

정상 로그인에 사용한 challenge를 다시 보내면 이미 소비된 challenge로 판단되어 `401 authentication_challenge_invalid_or_used`가 반환된다.

### 4) 패스키 삭제 뒤 로그인

패스키 A/B 두 개 등록 → A 삭제 → B 로그인 성공 → A로 로그인 시 `401 unknown_passkey` 또는 인증 실패 응답.

> 실제 제출본에는 위 항목마다 브라우저 Network 화면 또는 HTTP 클라이언트 결과를 붙이고 세션/토큰/challenge 전체 값은 마스킹한다.

## ⑤ AI와 나

- AI에게 맡긴 일: WebAuthn 라이브러리 사용 흐름, Supabase Edge Function 구조, React 상태 처리의 초안을 정리했다.
- 내가 직접 판단한 일: 과제 체크리스트에 맞춰 공개/비공개 경계를 정하고, 사용자 간 자료 격리와 패스키 2개/삭제 테스트 항목을 실제 프로젝트에 적용했다.
- AI 제안을 따르지 않은 일: 공개 포트폴리오 화면에 회원가입 중심 UI를 전면 배치하지 않고, 실제 제출 화면에서는 기존 소개 페이지를 우선하고 패스키 영역을 하단의 별도 섹션으로 분리했다.

## ⑥ 아직 못 막은 것

현재 구현은 과제 범위의 등록/로그인/자료 조회/사용자 격리를 충족하도록 만들었지만, 장기 운영 서비스 수준의 계정 복구·관리자 감사 로그·세션 폐기 목록까지는 구현하지 않았다. 특히 장기적으로는 세션을 DB 기반으로 관리하고 강제 폐기할 수 있도록 확장할 필요가 있다.

## 짧은 확인 방법 4줄

1. 어디로 가나요: 공개 HTTPS 포트폴리오의 맨 아래 `PRIVATE / 04`로 이동한다.
2. 세 단계 안에 무엇을 하나요: `패스키로 들어가기` → 기기에서 패스키 인증 → 비공개 3개 카드 확인.
3. 무엇이 보이면 통과인가요: 인증 전에는 본문이 없고, 인증 후에만 프로젝트 메모/지원 목록/개인 회고가 보인다.
4. 안 될 때는 무엇이 보이나요: 비인증 요청은 HTTP 401/403과 인증 오류 메시지가 보인다.
