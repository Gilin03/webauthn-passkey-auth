import { useCallback, useEffect, useState } from 'react';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import {
  ArrowUpRight,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  apiFetch,
  clearAuthChallenge,
  clearEnrollmentState,
  clearSessionToken,
  setSessionToken,
} from '@/lib/api';

const fakePrivateExamples = [
  '프로젝트 메모',
  '지원 목록',
  '개인 회고',
];

function getErrorMessage(error, flow) {
  const code = error?.code || error?.payload?.error || error?.message;

  if (error?.name === 'NotAllowedError') {
    return flow === 'registration'
      ? '패스키 등록이 취소되었습니다. 사용자와 패스키는 저장되지 않습니다.'
      : '패스키 인증이 취소되었습니다.';
  }

  if (code === 'client_configuration_missing') {
    return '인증 설정이 준비되지 않았습니다. 배포 환경의 공개 환경변수를 확인하세요.';
  }

  if (code === 'network_error') {
    return '네트워크 연결을 확인한 뒤 다시 시도하세요.';
  }

  if (error?.status >= 500 || code === 'server_error') {
    return '인증 서버에 문제가 있습니다. 잠시 후 다시 시도하세요.';
  }

  const messages = {
    authentication_challenge_missing: '인증 질문이 없어 로그인할 수 없습니다. 다시 시도하세요.',
    authentication_challenge_invalid_or_used: '만료되었거나 이미 사용한 인증 질문입니다. 다시 시도하세요.',
    authentication_verification_failed: '패스키 서명을 확인하지 못했습니다. 배포 주소의 RP ID/Origin과 등록된 기기를 확인하세요.',
    unknown_passkey: '등록되지 않았거나 삭제된 패스키입니다.',
    enrollment_expired: '패스키 등록 준비가 만료되었습니다. 처음부터 다시 시도하세요.',
    registration_challenge_invalid_or_used: '만료되었거나 이미 사용한 등록 질문입니다. 다시 시도하세요.',
    registration_verification_failed: '패스키 등록을 확인하지 못했습니다. 배포 주소의 RP ID/Origin과 기기 설정을 확인하세요.',
    registration_context_missing: '패스키 등록 준비가 없습니다. 처음부터 다시 시도하세요.',
    passkey_not_found: '이미 삭제된 패스키입니다.',
    authentication_required: '먼저 패스키로 인증하세요.',
    unauthenticated: '로그인 상태를 확인할 수 없습니다. 다시 인증하세요.',
  };

  return messages[code]
    || error?.message
    || (flow === 'registration' ? '패스키 등록에 실패했습니다.' : '인증에 실패했습니다.');
}

export default function PrivateArea() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [passkeys, setPasskeys] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollLabel, setEnrollLabel] = useState('');
  const [passkeyName, setPasskeyName] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');

  const resetPrivateState = useCallback(() => {
    setAuthenticated(false);
    setUser(null);
    setPasskeys([]);
    setItems([]);
  }, []);

  const loadPrivate = useCallback(async (announceError = false) => {
    try {
      const me = await apiFetch('me');
      if (!me.authenticated) throw new Error('unauthenticated');
      const privateData = await apiFetch('private-items');

      setAuthenticated(true);
      setUser(me.user);
      setPasskeys(me.passkeys || []);
      setItems(privateData.items || []);
      return true;
    } catch (error) {
      resetPrivateState();
      if (announceError || error?.status >= 500 || error?.code === 'network_error') {
        setStatus(getErrorMessage(error, 'authentication'));
      }
      return false;
    }
  }, [resetPrivateState]);

  useEffect(() => {
    loadPrivate();
  }, [loadPrivate]);

  async function signIn() {
    if (!browserSupportsWebAuthn()) {
      setStatus('이 브라우저에서는 패스키를 사용할 수 없습니다. 최신 브라우저에서 다시 시도하세요.');
      return;
    }

    setBusy(true);
    setStatus('서버에서 새 인증 질문을 받고 있습니다.');

    try {
      const options = await apiFetch('auth-options', { method: 'POST' });
      const { authChallengeToken, ...authOptions } = options;
      if (!authChallengeToken) {
        throw new Error('authentication_challenge_missing');
      }
      setStatus('기기의 패스키 확인 창에서 인증을 진행하세요.');
      const credential = await startAuthentication({ optionsJSON: authOptions });

      const result = await apiFetch('auth-verify', {
        method: 'POST',
        body: JSON.stringify(credential),
      });

      setSessionToken(result.sessionToken);
      setStatus('인증에 성공했습니다. 비공개 자료를 불러왔습니다.');
      await loadPrivate(true);
    } catch (error) {
      setStatus(getErrorMessage(error, 'authentication'));
      clearAuthChallenge();
      if (error?.status === 401 || error?.code === 'authentication_required') clearSessionToken();
      resetPrivateState();
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrollment(extraEnrollmentToken = '', extraRegistrationToken = '') {
    const enrollment = extraEnrollmentToken || enrollmentToken;
    const registration = extraRegistrationToken || registrationToken;

    try {
      if (registration || enrollment) {
        await apiFetch('enroll-cancel', {
          method: 'POST',
          headers: {
            ...(enrollment ? { 'X-Enrollment-Token': enrollment } : {}),
            ...(registration ? { 'X-Registration-Token': registration } : {}),
          },
        });
      }
    } catch {
      // 취소 동작은 화면 흐름을 막지 않도록 처리합니다.
    }
    setShowEnroll(false);
    setEnrollLabel('');
    setPasskeyName('');
    setEnrollmentToken('');
    setRegistrationToken('');
    clearEnrollmentState();
  }

  async function startEnroll() {
    if (!authenticated && !enrollLabel.trim()) {
      setStatus('테스트 계정 이름을 입력하세요. 예: 테스트 계정 A');
      return;
    }

    if (!browserSupportsWebAuthn()) {
      setStatus('이 브라우저에서는 패스키를 사용할 수 없습니다.');
      return;
    }

    setBusy(true);
    let activeEnrollmentToken = '';
    let activeRegistrationToken = '';

    try {
      setStatus('등록용 새 질문을 만들고 있습니다.');

      if (!authenticated) {
        const enrollment = await apiFetch('enroll-start', {
          method: 'POST',
          body: JSON.stringify({ username: enrollLabel.trim() }),
        });
        activeEnrollmentToken = enrollment.enrollmentToken;
        setEnrollmentToken(activeEnrollmentToken);
      }

      const options = await apiFetch('register-options', {
        method: 'POST',
        headers: activeEnrollmentToken
          ? { 'X-Enrollment-Token': activeEnrollmentToken }
          : {},
      });

      activeRegistrationToken = options.registrationToken;
      if (!activeRegistrationToken) {
        throw new Error('registration_context_missing');
      }
      setRegistrationToken(activeRegistrationToken);

      const { registrationToken: issuedRegistrationToken, ...publicOptions } = options;
      setStatus('기기에서 패스키를 만들고 있습니다. 취소하면 저장되지 않습니다.');
      const credential = await startRegistration({ optionsJSON: publicOptions });
      const friendlyName = (passkeyName.trim() || '내 패스키').slice(0, 120);

      const result = await apiFetch('register-verify', {
        method: 'POST',
        headers: {
          'X-Registration-Token': issuedRegistrationToken,
          ...(activeEnrollmentToken
            ? { 'X-Enrollment-Token': activeEnrollmentToken }
            : {}),
        },
        body: JSON.stringify({ ...credential, friendlyName }),
      });

      if (result.sessionToken) setSessionToken(result.sessionToken);

      setShowEnroll(false);
      setEnrollLabel('');
      setPasskeyName('');
      setEnrollmentToken('');
      setRegistrationToken('');
      setStatus(authenticated
        ? '현재 계정에 두 번째 패스키를 등록했습니다.'
        : '첫 패스키 등록이 완료되었습니다. 비공개 자료를 확인하세요.');
      await loadPrivate();
    } catch (error) {
      await cancelEnrollment(activeEnrollmentToken, activeRegistrationToken);
      setStatus(getErrorMessage(error, 'registration'));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await apiFetch('logout', { method: 'POST' });
      clearSessionToken();
      resetPrivateState();
      setStatus('로그아웃되었습니다. 다시 인증하기 전에는 비공개 자료를 요청할 수 없습니다.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'authentication'));
    } finally {
      setBusy(false);
    }
  }

  async function deletePasskey(id) {
    if (!window.confirm('이 패스키를 삭제할까요? 삭제한 패스키는 더 이상 로그인에 사용할 수 없습니다.')) return;

    setBusy(true);
    try {
      const result = await apiFetch('passkey-delete', {
        method: 'DELETE',
        query: { credential_id: id },
      });

      if (result.remaining === 0) {
        clearSessionToken();
        resetPrivateState();
        setStatus('마지막 패스키가 삭제되어 자동 로그아웃되었습니다. 다시 들어오려면 패스키를 새로 등록해야 합니다.');
      } else {
        setStatus(`패스키를 삭제했습니다. 남은 패스키 ${result.remaining}개로 계속 로그인할 수 있습니다.`);
        await loadPrivate();
      }
    } catch (error) {
      setStatus(getErrorMessage(error, 'authentication'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="private"
      className="relative overflow-hidden border-t border-navy-700 bg-navy-800 px-6 py-24 text-cream-50 sm:px-10 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="grid-bg h-full w-full" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-cream-50/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1.5 font-mono text-[11px] tracking-widest text-teal-200">
                <LockKeyhole className="h-3.5 w-3.5" /> PRIVATE / 04
              </span>
              <span className="text-xs text-cream-100/45">인증 후 서버에서만 내용 전달</span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">나만의 자리</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-cream-100/65">
              공개 포트폴리오와 분리한 개인 작업 기록입니다. 비밀번호 없이 패스키로 인증한 뒤에만 실제 내용이 열립니다.
            </p>
          </div>
          <a
            href="#top"
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-cream-100/55 transition hover:text-teal-200"
          >
            공개 영역으로 돌아가기 <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-cream-50/10 bg-navy-900/60 shadow-2xl shadow-black/10">
          {!authenticated ? (
            <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
              <div className="p-7 sm:p-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-300 text-navy-900">
                  <KeyRound className="h-6 w-6" />
                </div>
                <p className="mt-7 font-mono text-[11px] tracking-widest text-teal-200">PASSKEY ONLY</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">패스키로 잠금 해제</h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-cream-100/62">
                  서버가 매번 새로운 challenge를 만들고, 기기가 개인키로 서명한 응답을 저장된 공개키로 확인합니다. 성공해야만 비공개 자료가 조회됩니다.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={signIn}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cream-50 px-5 py-3.5 text-sm font-semibold text-navy-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  패스키로 들어가기
                </button>
                <button
  type="button"
  disabled={busy}
  onClick={() => {
    setShowEnroll(true);
    setStatus('');
  }}
  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-teal-300/30 bg-teal-300/10 px-5 py-3.5 text-sm font-semibold text-teal-100 transition hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-2 sm:mt-0"
>
  <UserPlus className="h-4 w-4" />
  첫 패스키 등록
</button>
              </div>

              <div className="border-t border-cream-50/10 bg-cream-50/[0.03] p-7 sm:p-10 lg:border-l lg:border-t-0">
                <p className="font-mono text-[11px] tracking-widest text-cream-100/40">PRIVATE CONTENT</p>
                <p className="mt-3 text-sm leading-6 text-cream-100/55">
                  인증 전에는 제목만 안내하고 실제 본문은 브라우저로 내려주지 않습니다.
                </p>
                <div className="mt-5 space-y-2">
                  {fakePrivateExamples.map((title) => (
                    <div key={title} className="flex items-center gap-3 rounded-lg border border-cream-50/10 px-3.5 py-3">
                      <LockKeyhole className="h-4 w-4 text-cream-100/35" />
                      <span className="text-sm text-cream-100/45">{title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-7 sm:p-10">
              <div className="flex flex-col gap-5 border-b border-cream-50/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-teal-200">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-mono text-[11px] tracking-widest">AUTHENTICATED</span>
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold">비공개 기록이 열렸습니다.</h3>
                  <p className="mt-2 text-sm text-cream-100/50">계정 식별자: {user?.username}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={logout}
                  className="inline-flex items-center gap-2 self-start rounded-lg border border-cream-50/15 px-3.5 py-2.5 text-xs font-semibold text-cream-100 transition hover:bg-cream-50/10 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" /> 로그아웃
                </button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {items.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-cream-50/10 bg-cream-50/[0.035] p-5">
                    <p className="font-mono text-[10px] tracking-widest text-teal-200/70">0{index + 1}</p>
                    <h4 className="mt-3 text-base font-semibold">{item.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-cream-100/65">{item.content}</p>
                  </article>
                ))}
              </div>

              <div className="mt-10 rounded-xl border border-cream-50/10 bg-black/10 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-teal-200/70">PASSKEYS</p>
                    <h4 className="mt-2 text-lg font-semibold">등록된 패스키</h4>
                    <p className="mt-1 text-xs text-cream-100/45">이름과 등록 날짜를 표시합니다. 실제 비밀키는 이 화면과 서버 모두에 저장하지 않습니다.</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowEnroll(true)}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-teal-300/30 bg-teal-300/10 px-3.5 py-2.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/15 disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> 새 패스키 등록
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {passkeys.map((passkey) => (
                    <div key={passkey.id} className="flex flex-col gap-3 rounded-lg border border-cream-50/10 bg-cream-50/[0.025] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{passkey.friendlyName}</p>
                        <p className="mt-1 text-xs text-cream-100/40">등록 {new Date(passkey.createdAt).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deletePasskey(passkey.id)}
                        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200 transition hover:bg-red-300/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 삭제
                      </button>
                    </div>
                  ))}
                </div>

                {passkeys.length === 0 && (
                  <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-xs leading-6 text-amber-100/70">
                    등록된 패스키가 없습니다. 이 상태에서는 다시 로그인할 수 없으며, 테스트용으로 새 패스키를 등록해야 합니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {status && (
            <div className="border-t border-cream-50/10 bg-black/10 px-7 py-4 sm:px-10">
              <p className="text-xs leading-6 text-cream-100/55">{status}</p>
            </div>
          )}
        </div>
      </div>

      {showEnroll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/80 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-cream-50/10 bg-navy-800 p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-teal-200">SETUP / TEST</p>
                <h3 className="mt-2 text-xl font-semibold">{authenticated ? '새 패스키 등록' : '첫 패스키 등록'}</h3>
                <p className="mt-2 text-sm leading-6 text-cream-100/55">
                  {authenticated
                    ? '현재 로그인한 계정에 백업용 패스키를 하나 더 등록합니다.'
                    : '과제 테스트용 계정을 만들고 첫 패스키를 등록합니다.'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={cancelEnrollment}
                className="text-xs text-cream-100/45 hover:text-cream-50 disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-7 space-y-4">
              {!authenticated && (
                <label className="block">
                  <span className="text-xs font-semibold text-cream-100/65">테스트 계정 이름</span>
                  <input
                    value={enrollLabel}
                    onChange={(event) => setEnrollLabel(event.target.value)}
                    placeholder="예: 테스트 계정 A"
                    className="mt-2 w-full rounded-lg border border-cream-50/15 bg-navy-900 px-3.5 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-50/25 focus:border-teal-300/60"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-cream-100/65">패스키 이름</span>
                <input
                  value={passkeyName}
                  onChange={(event) => setPasskeyName(event.target.value)}
                  placeholder="예: Chrome 노트북"
                  className="mt-2 w-full rounded-lg border border-cream-50/15 bg-navy-900 px-3.5 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-50/25 focus:border-teal-300/60"
                />
              </label>

              <div className="rounded-lg border border-teal-300/15 bg-teal-300/5 px-4 py-3 text-xs leading-6 text-teal-100/70">
                패스키 취소 시 사용자·패스키는 저장하지 않고, 준비한 challenge도 정리합니다.
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={cancelEnrollment}
                className="rounded-lg border border-cream-50/15 px-4 py-2.5 text-sm text-cream-100/65 hover:bg-cream-50/5 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={startEnroll}
                className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-teal-200 disabled:opacity-50"
              >
                패스키 등록 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
