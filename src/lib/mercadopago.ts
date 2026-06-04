import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN,
  options: { timeout: 10000 },
});

export function getMPClient() {
  return client;
}

export function getPreferenceClient() {
  return new Preference(client);
}
