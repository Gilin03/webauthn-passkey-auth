const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FUNCTION_URL =
  `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/passkey-api`;

const SESSION_KEY = 'tb_portfolio_session_token';
const ENROLL_KEY = 'tb_portfolio_enroll_token';
const REGISTER_KEY = 'tb_portfolio_register_token';
const AUTH_KEY = 'tb_portfolio_auth_challenge_token';

export function getSessionToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token) {
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token);
  }
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

function getEnrollmentToken() {
  return sessionStorage.getItem(ENROLL_KEY);
}

function getRegisterToken() {
  return sessionStorage.getItem(REGISTER_KEY);
}

function getAuthChallengeToken() {
  return sessionStorage.getItem(AUTH_KEY);
}

function saveTokens(data) {
  if (data?.sessionToken) {
    setSessionToken(data.sessionToken);
  }

  if (data?.enrollmentToken) {
    sessionStorage.setItem(
      ENROLL_KEY,
      data.enrollmentToken,
    );
  }

  if (data?.registrationToken) {
    sessionStorage.setItem(
      REGISTER_KEY,
      data.registrationToken,
    );
  }

  if (data?.authChallengeToken) {
    sessionStorage.setItem(
      AUTH_KEY,
      data.authChallengeToken,
    );
  }

  if (data?.clearEnrollmentToken) {
    sessionStorage.removeItem(ENROLL_KEY);
  }

  if (data?.clearRegistrationToken) {
    sessionStorage.removeItem(REGISTER_KEY);
  }

  if (data?.clearAuthChallengeToken) {
    sessionStorage.removeItem(AUTH_KEY);
  }

  if (data?.clearSessionToken) {
    clearSessionToken();
  }
}

export async function apiFetch(
  action,
  options = {},
) {
  const cleanAction = String(action)
    .replace(/^\/+/, '')
    .replace(/^\?action=/, '');

  const headers = new Headers(
    options.headers || {},
  );

  headers.set(
    'apikey',
    SUPABASE_KEY,
  );

  const sessionToken =
    getSessionToken();

  if (sessionToken) {
    headers.set(
      'Authorization',
      `Bearer ${sessionToken}`,
    );
  }

  const enrollmentToken =
    getEnrollmentToken();

  if (enrollmentToken) {
    headers.set(
      'X-Enrollment-Token',
      enrollmentToken,
    );
  }

  const registrationToken =
    getRegisterToken();

  if (registrationToken) {
    headers.set(
      'X-Registration-Token',
      registrationToken,
    );
  }

  const authChallengeToken =
    getAuthChallengeToken();

  if (authChallengeToken) {
    headers.set(
      'X-Auth-Challenge-Token',
      authChallengeToken,
    );
  }

  if (
    options.body &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  const response = await fetch(
    `${FUNCTION_URL}?action=${encodeURIComponent(cleanAction)}`,
    {
      ...options,
      headers,
    },
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error ||
        `HTTP ${response.status}`,
    );

    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  saveTokens(payload);

  return payload;
}

export function clearEnrollmentState() {
  sessionStorage.removeItem(
    ENROLL_KEY,
  );

  sessionStorage.removeItem(
    REGISTER_KEY,
  );
}

export function clearAuthChallenge() {
  sessionStorage.removeItem(
    AUTH_KEY,
  );
}