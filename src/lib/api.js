const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || '';

const FUNCTION_URL =
  `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/passkey-api`;

const ENROLL_KEY = 'tb_portfolio_enroll_token';
const REGISTER_KEY = 'tb_portfolio_register_token';
const AUTH_KEY = 'tb_portfolio_auth_challenge_token';

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error('client_configuration_missing');
    error.code = 'client_configuration_missing';
    throw error;
  }

  headers.set(
    'apikey',
    SUPABASE_KEY,
  );

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

  const { query, ...requestOptions } = options;
  const searchParams = new URLSearchParams({
    action: cleanAction,
  });

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  let response;
  try {
    response = await fetch(
      `${FUNCTION_URL}?${searchParams.toString()}`,
      {
        ...requestOptions,
        credentials: 'include',
        headers,
      },
    );
  } catch {
    const error = new Error('network_error');
    error.code = 'network_error';
    throw error;
  }

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
    error.code = payload?.error || 'http_error';
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
