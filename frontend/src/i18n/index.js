import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Load all language bundles up-front to avoid race with detection
import en from './en.json';
import ru from './ru.json';
import be from './be.json';

export const LANGS = [
  //{ code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'be', label: 'Беларуская', short: 'BE', flag: '🇧🇾' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
];

export const DEFAULT_LANG = 'ru';
export const STORAGE_KEY = 'ui:lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Make sure detector can pick from localStorage BEFORE fallback kicks in
    fallbackLng: DEFAULT_LANG,
    supportedLngs: LANGS.map(l => l.code),
    ns: ['common'],
    defaultNS: 'common',
    load: 'languageOnly',
    interpolation: { escapeValue: false },

    // Detection reads AND writes this key
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY
    },

    // Provide resources eagerly – no lazy add after init
    resources: {
      en: { common: en },
      ru: { common: ru },
      be: { common: be },
    }
  });

export default i18n;
