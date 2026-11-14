import { registerSW } from 'virtual:pwa-register';

/** Registra el service worker (solo en la versión publicada): se actualiza solo y permite usar la app sin conexión. */
export function registerPwa() {
  if (import.meta.env.PROD) registerSW({ immediate: true });
}
