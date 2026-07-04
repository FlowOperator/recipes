/**
 * Verifies that an incoming request carries a valid Supabase session JWT
 * belonging to the Owner. Rather than reimplementing JWT signature
 * verification/JWKS handling inside the Worker, we delegate verification
 * to Supabase itself by calling its /auth/v1/user endpoint with the
 * token - Supabase returns the user only if the token is valid and not
 * expired.
 */
export async function verifyOwnerRequest(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return false;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
