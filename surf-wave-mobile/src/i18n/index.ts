import ko from './ko.json';
import en from './en.json';

export const translations = {
  ko,
  en,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof ko;

export const getTranslation = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let result: any = translations[lang];

  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) break;
  }

  return result || key;
};
