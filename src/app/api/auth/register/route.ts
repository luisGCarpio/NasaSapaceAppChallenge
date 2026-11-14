import { NextResponse } from 'next/server';
import { registerUser } from '@/server/repositories/auth-repo';
import { attachSessionCookie, parseJsonBody } from '../../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const result = await registerUser(bodyResult.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json(
    { token: result.token, user: result.user, state: result.state },
    { status: 201 }
  );
  return attachSessionCookie(response, result.token);
}
