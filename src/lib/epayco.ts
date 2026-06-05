const APIFY_URL = 'https://apify.epayco.co';
const LOGIN_URL = `${APIFY_URL}/login`;
const SESSION_URL = `${APIFY_URL}/payment/session/create`;

const TIMEOUT_MS = 15000;

interface ApifyTokenResponse {
  token: string;
}

interface CreateSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    token: string;
  };
}

interface SessionData {
  checkout_version: string;
  name: string;
  currency: string;
  amount: number;
  description?: string;
  lang?: string;
  invoice?: string;
  country?: string;
  tax_base?: number;
  tax?: number;
  tax_ico?: number;
  response?: string;
  confirmation?: string;
  method?: string;
  dues?: number;
  methodsDisable?: string[];
  extras?: Record<string, string>;
}

async function requestWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getApifyToken(): Promise<string> {
  const publicKey = import.meta.env.EPAYCO_PUBLIC_KEY;
  const privateKey = import.meta.env.EPAYCO_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error('EPAYCO_PUBLIC_KEY y EPAYCO_PRIVATE_KEY son requeridos');
  }

  const credentials = btoa(`${publicKey}:${privateKey}`);

  const res = await requestWithTimeout(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error de autenticación Apify (${res.status}): ${text}`);
  }

  const data: ApifyTokenResponse = await res.json();
  return data.token;
}

export async function createCheckoutSession(
  sessionData: SessionData,
  apifyToken: string,
): Promise<CreateSessionResponse['data']> {
  const res = await requestWithTimeout(SESSION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apifyToken}`,
    },
    body: JSON.stringify(sessionData),
  });

  const responseText = await res.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Error al crear sesión ePayco (${res.status}): ${responseText}`);
  }

  if (!data.success || !data.data?.sessionId) {
    const apiErrors = data?.data?.errors?.map((e: any) => e.errorMessage).join('; ') || responseText;
    throw new Error(`ePayco rechazó la sesión: ${apiErrors}`);
  }

  return data.data;
}
