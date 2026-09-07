# 과제 8 패스키 포트폴리오 제출 설명서

> 비공개 자료는 과제용 가상 예시 데이터다. 실제 개인정보, 개인키, 서비스 비밀키, 전체 세션 토큰과 challenge는 이 문서에 기록하지 않는다.

## 현재 검증 상태

- 로컬 `npm run lint`: 통과
- 로컬 `npm run build`: 통과
- production bundle에 비공개 카드 본문 문자열이 없는지 확인: 통과
- 실제 HTTPS 배포 URL, Supabase 원격 스키마/API, 모바일 등록·로그인: 이 작업 환경에서는 미실행
- GitHub push, Vercel 배포, Supabase Edge Function 배포, DB 삭제·초기화: 수행하지 않음
- 공개 결과물 URL: `[배포 후 HTTPS URL 입력]`
- 소스 URL: `https://github.com/Gilin03/passkey` (원격 현재 상태는 이 환경에서 확인하지 못함)

실제 HTTP와 모바일 결과를 확인하기 전에는 아래의 `미실행` 항목을 통과로 표시하지 않는다.

## ① 무엇으로 붙였나

- 프런트: React/Vite
- 브라우저 WebAuthn: `@simplewebauthn/browser` 14.x
- 서버 검증: Supabase Edge Function의 `@simplewebauthn/server` 14.x
- 저장소: Supabase PostgreSQL
- 테이블: `portfolio_users`, `portfolio_sessions`, `passkeys`, `webauthn_challenges`, `private_items`
- 브라우저는 DB를 직접 조회하지 않고 Edge Function만 호출한다. 관련 테이블은 RLS를 켜고 서비스 역할 키는 Edge Function 안에서만 사용한다.
- 등록 시 `verifyRegistrationResponse`가 검증한 공개키만 `passkeys.public_key`에 저장한다. 개인키와 비밀번호는 요청·코드·DB에 저장하지 않는다.
- 로그인 시 `verifyAuthenticationResponse`가 저장된 공개키로 서명을 검증한다.
- 로그인 후에는 랜덤 bearer session token을 `sessionStorage`에 보관하고 `Authorization: Bearer ...` 헤더로 전송한다. 서버에는 원문이 아니라 SHA-256 hash만 `portfolio_sessions.token_hash`에 저장한다.

## ② 왜 골랐나

과제의 핵심이 비밀번호 없는 인증과 서버 측 검증이므로 WebAuthn/passkey를 선택했다. 개인키는 기기 또는 패스키 저장소에 남고 서버는 공개키만 보관하므로 비밀번호 데이터베이스를 만들 필요가 없다.

Supabase Edge Function과 PostgreSQL을 사용하면 기존 React/Vite 공개 포트폴리오를 유지하면서 인증 경계와 자료 조회를 서버에 둘 수 있다. 브라우저가 Supabase 테이블을 직접 조회하지 않게 해 비공개 자료가 인증 전 응답에 섞이지 않도록 했다.

## ③ 어디를 어떻게 고쳤나

### 1. 패스키 등록

- 프런트: `src/components/PrivateArea.jsx`의 `startEnroll`, `cancelEnrollment`
- API: `src/lib/api.js`의 `apiFetch` 및 등록 토큰 자동 전송
- 서버: `supabase/functions/passkey-api/index.ts`의 `registerOptions`, `registerVerify`
- 흐름: 최초 등록은 `enroll-start`가 5분 유효 HMAC 서명 enrollment token을 발급하고, `register-options`가 새 challenge와 서명된 `registrationToken`을 만든다. 브라우저가 `startRegistration`을 실행한 뒤 `register-verify`가 서버에서 attestation을 검증한다.
- 계약: 검증 요청은 `X-Registration-Token`을 사용한다. 검증 성공 후에만 사용자·가상 자료·공개키·세션을 저장한다.
- 취소: `enroll-cancel`이 미사용 등록 challenge를 지우고 프런트가 준비 상태를 초기화한다. 탭 종료처럼 취소 요청이 오지 않는 경우를 위한 별도 purge 작업은 아직 없다.

### 2. 패스키 로그인

- 프런트: `src/components/PrivateArea.jsx`의 `signIn`
- 서버: `authOptions`, `authVerify`, `consumeChallenge`
- 흐름: `auth-options`가 매번 새 challenge와 `authChallengeToken`을 발급한다. `apiFetch`가 이를 sessionStorage에 잠시 보관하고 `auth-verify` 요청에 `X-Auth-Challenge-Token`으로 보낸다.
- 서버는 challenge를 검증 전에 1회 소비하고 `verifyAuthenticationResponse`로 저장된 공개키와 서명을 확인한다. 성공한 경우에만 새 세션을 만든다.

### 3. 로그아웃

- 프런트: `src/components/PrivateArea.jsx`의 `logout`
- 서버: `supabase/functions/passkey-api/index.ts`의 `logout`, `currentUser`
- 현재 bearer token에 해당하는 세션의 `revoked_at`을 기록하고 프런트의 sessionStorage 값을 삭제한다. 마지막 패스키 삭제 시에도 해당 사용자의 활성 세션을 폐기한다.

### 4. 비공개 자료 조회와 사용자 격리

- 프런트: `loadPrivate`가 `me`와 `private-items`를 순서대로 호출한다.
- 서버: `privateItems`는 인증된 세션에서 얻은 `portfolio_users.id`만으로 `private_items.user_id`를 제한한다.
- 서버: `privateForUser`는 요청의 `user_id`가 인증 세션의 사용자 ID와 다르면 `403 forbidden_user_resource`를 반환한다. 따라서 URL이나 body의 다른 `user_id`를 그대로 신뢰하지 않는다.
- 최초 사용자마다 서버가 짧은 계정 marker를 포함한 서로 다른 3개의 가상 자료를 만든다. 이 본문은 React bundle에 넣지 않는다.
- 패스키 삭제: `PrivateArea.jsx`의 `deletePasskey`가 `apiFetch('passkey-delete', { query: { credential_id } })` 형태로 query를 분리한다. 서버 `deletePasskey`는 현재 세션의 사용자 소유 credential만 삭제한다.

### 5. 환경변수

프런트는 `.env.example`의 다음 placeholder 이름을 사용한다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
```

Edge Function에는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`을 설정한다. 실제 값은 코드·문서·캡처에 적지 않는다.

## ④ 안 열리는 것을 확인한 기록

아래는 결과를 실제 요청으로 채우는 기록표다. 이 저장소 작업 중에는 배포 URL과 원격 인증 정보가 없어 HTTP/모바일 항목을 실행하지 않았다.

| 확인 항목 | 성공 요청 | 거절 요청 | 현재 판정 |
|---|---|---|---|
| 로그인 없이 비공개 자료 | 인증 후 `GET /functions/v1/passkey-api?action=private-items` → `200`과 내 자료 | 인증 헤더 없이 같은 요청 → `401 authentication_required` | 미실행 |
| 다른 계정 자료 | A 세션으로 A 자료 → `200` | A 세션으로 B `user_id` 요청 → `403 forbidden_user_resource`; B도 역방향 동일 | 미실행 |
| challenge 재사용 | 새 challenge + 정상 서명 → `200` | 같은 `X-Auth-Challenge-Token` 재전송 → `401 authentication_challenge_invalid_or_used` | 미실행 |
| 패스키 삭제 | 패스키 1 삭제 후 패스키 2 로그인 → 성공 | 삭제한 패스키 1 로그인 → `401` 인증 실패 | 미실행 |
| 로그아웃 | 로그인 세션으로 `private-items` → `200` | 로그아웃 후 같은 token → `401` | 미실행 |

제출 시 응답에 포함할 값은 다음처럼 마스킹한다.

```text
Authorization: Bearer ***MASKED***
X-Auth-Challenge-Token: 8d41c9a2********
credential_id: ***MASKED***
HTTP 401
{"error":"authentication_required"}
```

challenge 두 개 비교도 앞 8자만 남긴다. 전체 token, cookie, 개인키, service role key는 남기지 않는다.

### 등록 기록 작성 양식

```text
등록 challenge #1: [앞 8자]******** / HTTP 200
등록 challenge #2: [앞 8자]******** / HTTP 200
판정: 두 challenge가 서로 다름
등록 요청 본문: credential ID·clientDataJSON·attestation 응답만 확인
개인키: 전송되지 않음
서버 저장: public_key만 저장, friendly_name과 created_at 표시
등록 취소: 사용자·패스키 레코드가 생성되지 않음 / 실제 DB 확인 결과 작성
패스키 저장 위치: [실제 사용한 기기 자체·Google Password Manager·iCloud Keychain·보안 키 중 하나]
```

### 로그인 기록 작성 양식

```text
로그인 challenge #1: [앞 8자]********
로그인 challenge #2: [앞 8자]********
판정: 두 challenge가 서로 다름
정상 서명: [실제 HTTP 상태와 화면 결과]
잘못된 서명: [실제 HTTP 상태와 화면 결과]
재사용 challenge: [실제 HTTP 상태와 화면 결과]
세션/토큰: sessionStorage bearer 방식, 값은 ***MASKED***
```

### 패스키 2개와 0개 상태

```text
패스키 1: 이름 [실제 입력값] / 등록일 [날짜]
패스키 2: 이름 [실제 입력값] / 등록일 [날짜]
패스키 1 삭제: [실제 결과]
남은 패스키 2 로그인: [실제 결과]
삭제한 패스키 1 로그인: [실제 결과]
마지막 패스키 삭제: 자동 로그아웃 및 활성 세션 폐기 여부 [실제 결과]
패스키 0개 화면: 등록된 패스키가 없고 새 패스키 등록이 필요하다는 안내
```

모바일을 실제로 실행할 때는 HTTPS 배포 주소의 Android Chrome 또는 iPhone Safari에서 등록하고, 실제 저장 위치를 `Google Password Manager`, `iCloud Keychain` 등 사용한 방식으로 기록한다.

## ⑤ AI와 나

- AI에게 맡긴 일: 기존 코드와 과제 문서를 대조하고, WebAuthn challenge/검증 흐름, bearer 세션, 등록 취소, 사용자 격리, 삭제 query 조립의 구현 보조와 lint/build 점검을 맡겼다.
- 내가 직접 판단한 일: 공개 Hero → What I Did → What I Like 순서를 유지하고 PRIVATE / 04를 하단에 분리했다. A/B 자료는 실제 개인정보가 아닌 서버 생성 계정 marker로 구분했다. 배포·push·DB 삭제는 수행하지 않았다.
- AI 제안을 따르지 않은 일: 원격 migration SQL을 확인할 수 없는 상태에서 추측해 만들지 않았고, 승인 없는 GitHub push·Vercel/Supabase 배포·DB 초기화를 하지 않았다. 제출 기록도 실행하지 않은 HTTP·모바일 결과를 통과로 쓰지 않았다.

## ⑥ 아직 못 막은 것

- 탭 종료로 취소 API가 호출되지 않는 경우를 위한 주기적 challenge purge 작업이 없다. 현재 challenge는 5분 만료 검사를 통과하지 못하지만 만료 행 자체를 즉시 정리하는 작업은 별도 구현하지 않았다.
- 세션 토큰을 sessionStorage에 보관하므로 XSS가 발생하면 bearer token 탈취 위험이 있다. CSP 강화와 더 엄격한 XSS 방어가 필요하다.
- 계정 복구·계정 삭제·관리자 감사 로그와 모든 기기 세션을 한 번에 종료하는 화면은 구현하지 않았다.

## 짧은 확인 방법 4줄

1. 어디로 가나요: 공개 HTTPS 결과물의 맨 아래 `PRIVATE / 04`로 이동한다.
2. 세 단계 안에 무엇을 하나요: `패스키로 들어가기` → 기기 인증 → 비공개 영역을 확인한다.
3. 무엇이 보이면 통과인가요: 인증 전에는 카드 본문이 없고, 인증 후에만 가상 비공개 자료 3개와 패스키 목록이 보인다.
4. 안 될 때는 무엇이 보이나요: 비인증·타 계정·재사용 challenge·삭제된 패스키 요청은 401/403 또는 이해 가능한 오류 안내를 보인다.

## 제출 전 체크

- [ ] 결과물과 소스 URL이 HTTPS이고 새 시크릿 창에서 로그인 없이 열린다.
- [ ] 공개 첫 화면과 기존 공개 포트폴리오가 유지된다.
- [ ] 비공개 본문이 인증 전 HTML·JS·API 응답에 없다.
- [ ] 실제 HTTPS 환경에서 A/B, challenge 재사용, 로그아웃, 패스키 2개·삭제를 HTTP 증거로 확인했다.
- [ ] 모바일 패스키 저장 위치와 등록 취소 결과를 기록했다.
- [ ] 모든 token·challenge·credential ID·서비스 비밀값을 마스킹했다.
