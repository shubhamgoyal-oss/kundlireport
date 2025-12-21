import { useTranslation } from 'react-i18next';

export default function ContactSection() {
  const { i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  return (
    <section className="py-8 sm:py-12 bg-background">
      <div className="container mx-auto px-4 text-center">
        <p className="text-base sm:text-lg text-muted-foreground italic mb-2">
          {isHindi 
            ? 'किसी भी प्रतिक्रिया या सुझाव के लिए, आप हमसे संपर्क कर सकते हैं:' 
            : 'For any feedback or suggestions, you can reach us at:'}
        </p>
        <a 
          href="tel:+919930601106" 
          className="text-xl sm:text-2xl font-semibold text-primary hover:underline"
        >
          +91 9930601106
        </a>
        <p className="text-base sm:text-lg text-muted-foreground mt-2">
          — Shubham Goyal
        </p>
      </div>
    </section>
  );
}
