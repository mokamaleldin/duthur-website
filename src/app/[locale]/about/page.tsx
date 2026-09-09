import { isLocale } from '@/lib/i18n';
import type { Locale } from '@/types/store';
import { notFound } from 'next/navigation';

const aboutCopy = {
  en: {
    brand: 'DUTHUR',
    paragraphs: [
      'The brand was created for young men who want clothes that feel grounded, clean, and connected to who they are — without exaggeration or noise.',
      'Every piece is designed to carry a sense of identity through fit, material, proportion, and subtle details. Duthur is not just about looking good. It is about wearing something that feels close to you.',
      'Duthur means covering, surrounding, and containing. That meaning shapes the brand: clothing that gives comfort, modesty, and identity in a simple everyday form.',
    ],
    closing: 'Quiet identity. Wearable meaning.',
  },
  ar: {
    brand: 'دُثُر',
    paragraphs: [
      'أُنشئت العلامة للشباب الذين يريدون ملابس تشعرهم بالثبات والنقاء وبصلة حقيقية مع أنفسهم، من دون مبالغة أو صخب.',
      'تُصمَّم كل قطعة لتحمل إحساسًا بالهوية من خلال القَصّة، والخامة، والنِّسب، والتفاصيل الهادئة. دُثُر لا تتعلق فقط بأن تبدو بمظهر جيد. بل بأن ترتدي شيئًا تشعر أنه قريب منك.',
      'دُثُر تعني الستر، والإحاطة، والاحتواء. هذا المعنى يشكّل العلامة: ملابس تمنح الراحة، والاحتشام، والهوية في هيئة يومية بسيطة.',
    ],
    closing: 'هوية هادئة. معنى يُرتدى.',
  },
  tr: {
    brand: 'DUTHUR',
    paragraphs: [
      'Marka, abartıdan ve gürültüden uzak; ayakları yere basan, duru ve kim olduklarıyla bağ kuran kıyafetler isteyen genç erkekler için yaratıldı.',
      'Her parça; kalıp, materyal, oran ve ince detaylar üzerinden bir kimlik hissi taşıyacak şekilde tasarlanır. Duthur sadece iyi görünmekle ilgili değildir. Sana yakın hissettiren bir şeyi giymekle ilgilidir.',
      'Duthur; örtmek, sarmak ve içine almak anlamına gelir. Bu anlam markayı şekillendirir: rahatlık, ölçülülük ve kimliği sade bir günlük formda sunan giyim.',
    ],
    closing: 'Sessiz kimlik. Giyilebilir anlam.',
  },
} satisfies Record<Locale, { brand: string; paragraphs: string[]; closing: string }>;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = aboutCopy[locale];

  return (
    <main className="about-page">
      <article className="about-content">
        <h1>{copy.brand}</h1>
        <div className="about-copy">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="about-closing">{copy.closing}</p>
        </div>
      </article>
    </main>
  );
}
