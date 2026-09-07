import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@14.0.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const RP_NAME = 'TB Portfolio';
const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'localhost';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'http://localhost:5173';

const SESSION_TTL = 60 * 60 * 8;
const CHALLENGE_TTL = 60 * 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-enrollment-token, x-registration-token, x-auth-challenge-id',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function readBearer(req: Request) {
  const value = req.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

function randomToken(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  let binary = '';
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function requestJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

type PendingEnrollment = {
  userId: string;
  webAuthnUserId: string;
  username: string;
};

async function hmacSign(value: string) {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)),
  );
}

async function signPending(value: PendingEnrollment) {
  const encoded = base64url(JSON.stringify(value));
  const signature = base64url(await hmacSign(encoded));
  return `${encoded}.${signature}`;
}

async function readPending(req: Request) {
  const token = req.headers.get('x-enrollment-token');
  if (!token) return null;
  const index = token.lastIndexOf('.');
  if (index <= 0) return null;
  const encoded = token.slice(0, index);
  const signature = token.slice(index + 1);
  const expected = base64url(await hmacSign(encoded));
  if (signature !== expected) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64urlDecode(encoded))) as PendingEnrollment;
  } catch {
    return null;
  }
}

async function currentUser(req: Request) {
  const token = readBearer(req);
  if (!token) return null;

  const hash = await sha256(token);
  const { data: session } = await supabase
    .from('portfolio_sessions')
    .select('id,user_id,expires_at,revoked_at')
    .eq('token_hash', hash)
    .maybeSingle();

  if (!session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) {
    return null;
  }

  const { data: user } = await supabase
    .from('portfolio_users')
    .select('id,username')
    .eq('id', session.user_id)
    .maybeSingle();

  return user ? { user, sessionId: session.id, token } : null;
}

async function createSession(userId: string) {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000).toISOString();

  const { error } = await supabase.from('portfolio_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw error;
  return token;
}

async function saveChallenge(
  sessionId: string,
  purpose: 'registration' | 'authentication',
  userId: string | null,
  challenge: string,
) {
  const { error } = await supabase.from('webauthn_challenges').insert({
    session_id: sessionId,
    purpose,
    user_id: userId,
    challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL * 1000).toISOString(),
  });
  if (error) throw error;
}

async function consumeChallenge(sessionId: string, purpose: 'registration' | 'authentication') {
  const { data } = await supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('session_id', sessionId)
    .eq('purpose', purpose)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || Date.parse(data.expires_at) <= Date.now()) return null;

  const { data: updated } = await supabase
    .from('webauthn_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();

  return updated ? data : null;
}

async function registerOptions(req: Request) {
  const sessionUser = await currentUser(req);
  const pending = sessionUser ? null : await readPending(req);
  const userId = sessionUser?.user.id || pending?.userId;

  if (!userId) return json({ error: 'enrollment_or_authentication_required' }, 401);

  const username = sessionUser?.user.username || pending!.username;
  const webAuthnUserId = pending?.webAuthnUserId || sessionUser!.user.id;
  const registrationId = randomToken(24);

  const { data: existing } = await supabase
    .from('passkeys')
    .select('credential_id,transports')
    .eq('user_id', userId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    userID: new TextEncoder().encode(webAuthnUserId),
    attestationType: 'none',
    excludeCredentials: (existing || []).map((row) => ({
      id: row.credential_id,
      transports: row.transports || [],
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  await saveChallenge(registrationId, 'registration', userId, options.challenge);

  return json({ ...options, registrationToken: registrationId });
}

async function registerVerify(req: Request) {
  const registrationId = req.headers.get('x-registration-token');
  if (!registrationId) return json({ error: 'registration_context_missing' }, 401);

  const challenge = await consumeChallenge(registrationId, 'registration');
  if (!challenge?.user_id) return json({ error: 'registration_challenge_invalid_or_used' }, 401);

  const b = await requestJson(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: b,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch {
    return json({ error: 'registration_verification_failed' }, 400);
  }

  if (!verification.verified || !verification.registrationInfo) {
    return json({ error: 'registration_verification_failed' }, 400);
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const friendlyName = String(b.friendlyName || '내 패스키').trim().slice(0, 120) || '내 패스키';

  const { data: existingUser } = await supabase
    .from('portfolio_users')
    .select('id')
    .eq('id', challenge.user_id)
    .maybeSingle();

  if (!existingUser) {
    const pending = await readPending(req);
    if (!pending || pending.userId !== challenge.user_id) {
      return json({ error: 'enrollment_expired' }, 401);
    }

    const { error: userError } = await supabase
      .from('portfolio_users')
      .insert({ id: pending.userId, username: pending.username });

    if (userError) return json({ error: 'user_creation_failed' }, 500);

    const { error: itemError } = await supabase.from('private_items').insert([
      { user_id: pending.userId, title: '프로젝트 메모', content: '가상의 프로젝트 기록입니다. 공개 페이지와 분리한 개인 작업 메모입니다.' },
      { user_id: pending.userId, title: '지원 목록', content: '가상의 지원처 A · 가상의 지원처 B · 가상의 지원처 C' },
      { user_id: pending.userId, title: '개인 회고', content: '패스키와 공개키, 일회용 challenge를 확인한 가상 회고입니다.' },
    ]);

    if (itemError) {
      await supabase.from('portfolio_users').delete().eq('id', pending.userId);
      return json({ error: 'private_item_storage_failed' }, 500);
    }
  }

  const { error: passkeyError } = await supabase.from('passkeys').insert({
    user_id: challenge.user_id,
    credential_id: credential.id,
    public_key: base64url(credential.publicKey),
    sign_count: credential.counter,
    transports: credential.transports || [],
    friendly_name: friendlyName,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
  });

  if (passkeyError) return json({ error: 'passkey_storage_failed' }, 500);

  const { data: hasSession } = await supabase
    .from('portfolio_sessions')
    .select('id')
    .eq('user_id', challenge.user_id)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  const sessionToken = hasSession ? undefined : await createSession(challenge.user_id);

  return json({
    verified: true,
    sessionToken,
    stored: { publicKeyOnly: true, credentialId: credential.id, friendlyName },
  });
}

async function authOptions() {
  const challengeId = randomToken(24);
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
  });
  await saveChallenge(challengeId, 'authentication', null, options.challenge);
  return json({ ...options, challengeId });
}

async function authVerify(req: Request) {
  const challengeId = req.headers.get('x-auth-challenge-id');
  if (!challengeId) return json({ error: 'authentication_challenge_missing' }, 401);

  const challenge = await consumeChallenge(challengeId, 'authentication');
  if (!challenge) return json({ error: 'authentication_challenge_invalid_or_used' }, 401);

  const b = await requestJson(req);
  const credentialId = String(b.id || '');
  if (!credentialId) return json({ error: 'unknown_passkey' }, 401);

  const { data: passkey } = await supabase
    .from('passkeys')
    .select('*')
    .eq('credential_id', credentialId)
    .maybeSingle();

  if (!passkey) return json({ error: 'unknown_passkey' }, 401);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: b,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: base64urlDecode(passkey.public_key),
        counter: passkey.sign_count,
        transports: passkey.transports || [],
      },
    });
  } catch {
    return json({ error: 'authentication_verification_failed' }, 401);
  }

  if (!verification.verified) return json({ error: 'authentication_verification_failed' }, 401);

  await supabase
    .from('passkeys')
    .update({
      sign_count: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', passkey.id)
    .eq('user_id', passkey.user_id);

  const token = await createSession(passkey.user_id);
  return json({ verified: true, sessionToken: token, user: { id: passkey.user_id } });
}

async function privateItems(req: Request) {
  const session = await currentUser(req);
  if (!session) return json({ error: 'authentication_required' }, 401);

  const { data, error } = await supabase
    .from('private_items')
    .select('id,title,content')
    .eq('user_id', session.user.id)
    .order('created_at');

  if (error) return json({ error: 'private_data_unavailable' }, 500);
  return json({ items: data || [] });
}

async function me(req: Request) {
  const session = await currentUser(req);
  if (!session) return json({ authenticated: false }, 401);

  const { data } = await supabase
    .from('passkeys')
    .select('credential_id,friendly_name,created_at,last_used_at')
    .eq('user_id', session.user.id)
    .order('created_at');

  return json({
    authenticated: true,
    user: session.user,
    passkeys: (data || []).map((row) => ({
      id: row.credential_id,
      friendlyName: row.friendly_name,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    })),
  });
}

async function passkeys(req: Request) {
  const session = await currentUser(req);
  if (!session) return json({ error: 'authentication_required' }, 401);

  const { data } = await supabase
    .from('passkeys')
    .select('credential_id,friendly_name,created_at,last_used_at')
    .eq('user_id', session.user.id)
    .order('created_at');

  return json({
    passkeys: (data || []).map((row) => ({
      id: row.credential_id,
      friendlyName: row.friendly_name,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    })),
  });
}

async function deletePasskey(req: Request, credentialId: string) {
  const session = await currentUser(req);
  if (!session) return json({ error: 'authentication_required' }, 401);

  const { data: passkey } = await supabase
    .from('passkeys')
    .select('id')
    .eq('credential_id', credentialId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!passkey) return json({ error: 'passkey_not_found' }, 404);

  const { error } = await supabase
    .from('passkeys')
    .delete()
    .eq('id', passkey.id)
    .eq('user_id', session.user.id);

  if (error) return json({ error: 'passkey_delete_failed' }, 500);

  const { count } = await supabase
    .from('passkeys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  if ((count || 0) === 0) {
    await supabase
      .from('portfolio_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .is('revoked_at', null);
  }

  return json({ ok: true, remaining: count || 0, loggedOut: (count || 0) === 0 });
}

async function logout(req: Request) {
  const session = await currentUser(req);
  if (session) {
    await supabase
      .from('portfolio_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', session.sessionId);
  }
  return json({ ok: true });
}

async function cancelEnrollment(req: Request) {
  const enrollmentToken = req.headers.get('x-enrollment-token');
  if (enrollmentToken) {
    const pending = await readPending(req);
    if (pending) {
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', pending.userId)
        .is('used_at', null);
    }
  }

  const registrationToken = req.headers.get('x-registration-token');
  if (registrationToken) {
    await supabase
      .from('webauthn_challenges')
      .delete()
      .eq('session_id', registrationToken)
      .is('used_at', null);
  }

  return json({ ok: true, storedUser: false, storedPasskey: false });
}

async function privateForUser(req: Request, targetUserId: string) {
  const session = await currentUser(req);
  if (!session) return json({ error: 'authentication_required' }, 401);
  if (!targetUserId) return json({ error: 'target_user_required' }, 400);
  if (targetUserId !== session.user.id) return json({ error: 'forbidden_user_resource' }, 403);
  return privateItems(req);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || '';

  try {
    if (action === 'enroll-start' && req.method === 'POST') {
      const b = await requestJson(req);
      const username = String(b.username || '').trim().slice(0, 80);
      if (!username) return json({ error: 'invalid_username' }, 400);

      const token = await signPending({
        userId: crypto.randomUUID(),
        webAuthnUserId: crypto.randomUUID(),
        username,
      });
      return json({ ok: true, username, enrollmentToken: token });
    }

    if (action === 'enroll-cancel' && req.method === 'POST') {
      return cancelEnrollment(req);
    }

    if (action === 'register-options' && req.method === 'POST') {
      return registerOptions(req);
    }

    if (action === 'register-verify' && req.method === 'POST') {
      return registerVerify(req);
    }

    if (action === 'auth-options' && req.method === 'POST') {
      return authOptions();
    }

    if (action === 'auth-verify' && req.method === 'POST') {
      return authVerify(req);
    }

    if (action === 'me' && req.method === 'GET') {
      return me(req);
    }

    if (action === 'private-items' && req.method === 'GET') {
      return privateItems(req);
    }

    if (action === 'private-for-user' && req.method === 'GET') {
      return privateForUser(req, url.searchParams.get('user_id') || '');
    }

    if (action === 'passkeys' && req.method === 'GET') {
      return passkeys(req);
    }

    if (action === 'passkey-delete' && req.method === 'DELETE') {
      return deletePasskey(req, url.searchParams.get('credential_id') || '');
    }

    if (action === 'logout' && req.method === 'POST') {
      return logout(req);
    }

    return json({ error: 'not_found' }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: 'server_error' }, 500);
  }
});
