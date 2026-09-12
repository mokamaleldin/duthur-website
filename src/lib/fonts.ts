import localFont from 'next/font/local';

export const geist = localFont({
  src: [
    {
      path: '../fonts/geist/Geist[wght].ttf',
      style: 'normal',
    },
    {
      path: '../fonts/geist/Geist-Italic[wght].ttf',
      style: 'italic',
    },
  ],
  variable: '--font-geist',
  display: 'swap',
});

export const cairo = localFont({
  src: '../fonts/cairo/Cairo-VariableFont_slnt,wght.ttf',
  variable: '--font-cairo',
  display: 'swap',
});

export const xbShafigh = localFont({
  src: [
    {
      path: '../fonts/xb-shafigh/XB Shafigh.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/xb-shafigh/XB ShafighBd.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-shafigh',
  display: 'swap',
});
