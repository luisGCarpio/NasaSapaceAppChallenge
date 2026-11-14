import { NextResponse } from 'next/server';
import { loginUser } from '@/server/repositories/auth-repo';
import { attachSessionCookie, parseJsonBody } from '../../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const { identifier, username, email, password, quickLogin } = bodyResult.data;
  const result = await loginUser({
    identifier: typeof identifier === 'string' ? identifier : undefined,
    username: typeof username === 'string' ? username : undefined,
    email: typeof email === 'string' ? email : undefined,
    password: typeof password === 'string' ? password : undefined,
    quickLogin: Boolean(quickLogin),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json(
    { token: result.token, user: result.user, state: result.state },
    { status: 200 }
  );
  return attachSessionCookie(response, result.token);
}
