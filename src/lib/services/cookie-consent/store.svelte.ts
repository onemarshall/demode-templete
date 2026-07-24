export type ConsentAcceptType = "all" | "custom" | "necessary" | "";

export type ConsentPreferences = {
  acceptType: ConsentAcceptType;
  acceptedCategories: string[];
  rejectedCategories: string[];
  acceptedServices: Record<string, string[]>;
  rejectedServices: Record<string, string[]>;
};

export type ConsentState = {
  ready: boolean;
  hasConsent: boolean;
  preferences: ConsentPreferences;
};

export const defaultConsentPreferences: ConsentPreferences = {
  acceptType: "",
  acceptedCategories: [],
  rejectedCategories: [],
  acceptedServices: {},
  rejectedServices: {},
};

let readyState = $state(false);
let hasConsentState = $state(false);
let preferencesState = $state<ConsentPreferences>({ ...defaultConsentPreferences });

export const cookieConsentState = {
  get ready() {
    return readyState;
  },
  get hasConsent() {
    return hasConsentState;
  },
  get preferences() {
    return preferencesState;
  },

  setReady(ready: boolean) {
    readyState = ready;
  },
  setPreferences(preferences: Partial<ConsentPreferences>, hasConsent = true) {
    hasConsentState = hasConsent;
    preferencesState = { ...defaultConsentPreferences, ...preferencesState, ...preferences };
  },
  reset() {
    readyState = false;
    hasConsentState = false;
    preferencesState = { ...defaultConsentPreferences };
  },
};

export const isAnalyticsAllowed = () => preferencesState.acceptedCategories.includes("analytics");

export const isAdsAllowed = () => preferencesState.acceptedCategories.includes("ads");
