import { Font } from '@react-pdf/renderer';

// Disable hyphenation to prevent character substitution issues
Font.registerHyphenationCallback(word => [word]);

// Register DejaVu Sans as fallback to handle all characters properly
// DejaVu Sans has complete Latin character coverage
Font.register({
  family: 'DejaVuSans',
  fonts: [
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
      fontStyle: 'normal',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'normal',
    },
    // Map italic to regular (we don't have a separate italic font file)
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

// Register neutral Latin family alias
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/DejaVuSans.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/DejaVuSans.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// Register Hindi and Telugu fonts for native-script rendering
Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'NotoSansTelugu',
  fonts: [
    { src: '/fonts/NotoSansTelugu-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTelugu-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTelugu-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansTelugu-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'NotoSansKannada',
  fonts: [
    { src: '/fonts/NotoSansKannada-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansKannada-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansKannada-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansKannada-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'NotoSansTamil',
  fonts: [
    { src: '/fonts/NotoSansTamil-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTamil-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTamil-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansTamil-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// Register Gujarati fonts for native-script rendering
Font.register({
  family: 'NotoSansGujarati',
  fonts: [
    { src: '/fonts/NotoSansGujarati-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansGujarati-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansGujarati-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansGujarati-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// Register lighter Gujarati body + stronger Gujarati heading families.
// This keeps body text readable while preserving bold section headers.
Font.register({
  family: 'KohinoorGujaratiBody',
  fonts: [
    { src: '/fonts/KohinoorGujarati-Light-Stripped.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    // No true italic file available; map italic to regular/bold to keep react-pdf font resolution stable.
    { src: '/fonts/KohinoorGujarati-Light-Stripped.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'KohinoorGujaratiHead',
  fonts: [
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/KohinoorGujarati-Bold-Stripped.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});
