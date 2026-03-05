import { useEffect } from 'react';
import { useParams, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const LanguageWrapper = () => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  // Only allow supported languages: en, hi, te, kn, mr, ta, gu
  const supportedLangs = ['en', 'hi', 'te', 'kn', 'mr', 'ta', 'gu'];
  if (!supportedLangs.includes(lang)) {
    return <Navigate to="/hi" replace />;
  }

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  return <Outlet />;
};
