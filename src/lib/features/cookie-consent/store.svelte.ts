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

let _ready = $state(false);
let _hasConsent = $state(false);
let _preferences = $state<ConsentPreferences>({ ...defaultConsentPreferences });

export const cookieConsentState = {
  get ready() {
    return _ready;
  },
  get hasConsent() {
    return _hasConsent;
  },
  get preferences() {
    return _preferences;
  },

  setReady(ready: boolean) {
    _ready = ready;
  },
  setPreferences(preferences: Partial<ConsentPreferences>, hasConsent = true) {
    _hasConsent = hasConsent;
    _preferences = { ...defaultConsentPreferences, ..._preferences, ...preferences };
  },
  reset() {
    _ready = false;
    _hasConsent = false;
    _preferences = { ...defaultConsentPreferences };
  },
};

export const isAnalyticsAllowed = () => _preferences.acceptedCategories.includes("analytics");

export const isAdsAllowed = () => _preferences.acceptedCategories.includes("ads");
