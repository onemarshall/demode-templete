import { browser } from "$app/env";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import * as CookieConsent from "vanilla-cookieconsent";
import { createCookieConsentConfig } from "./config";
import { syncCookieConsentState } from "./api";
import { cookieConsentState } from "./store.svelte";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export function initCookieConsent(): Promise<void> {
  if (!browser || !import.meta.env.PROD) return Promise.resolve();
  // if (!browser) return Promise.resolve()
  if (initialized) {
    syncCookieConsentState();
    return initializationPromise ?? Promise.resolve();
  }
  if (initializationPromise) return initializationPromise;

  const fontsReady = "fonts" in document ? document.fonts.ready : Promise.resolve();

  initializationPromise = fontsReady.then(async () => {
    await CookieConsent.run(createCookieConsentConfig());
    syncCookieConsentState();
    cookieConsentState.setReady(true);
    initialized = true;
  });

  return initializationPromise;
}
