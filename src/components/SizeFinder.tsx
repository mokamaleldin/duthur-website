'use client';

import { useState } from 'react';
import type { Locale } from '@/types/store';
import { dict } from '@/lib/i18n';
import { normalizeDigits, parseNumericInput } from '@/lib/numbers';

const sizes = [
  { name: 'S', length: 73, chest: 56, sleeve: 23, h: [160, 170], w: [50, 63] },
  { name: 'M', length: 75, chest: 58, sleeve: 24, h: [168, 178], w: [60, 75] },
  { name: 'L', length: 77, chest: 61, sleeve: 24.5, h: [174, 186], w: [72, 88] },
  { name: 'XL', length: 78, chest: 64, sleeve: 25, h: [178, 192], w: [85, 102] },
  { name: 'XXL', length: 80, chest: 66, sleeve: 25.5, h: [182, 198], w: [100, 118] },
] as const;

type Feedback = {
  text: string;
  type: 'recommended' | 'warning' | 'error';
  size?: string;
};

export function SizeFinder({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeDigits(e.target.value);
    setHeight(val);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeDigits(e.target.value);
    setWeight(val);
  };

  function findSize() {
    // 1. Missing values
    if (!height.trim() || !weight.trim()) {
      setFeedback({
        text: t.sizeEnterValues,
        type: 'error',
      });
      return;
    }

    const parsedH = parseNumericInput(height);
    const parsedW = parseNumericInput(weight);

    // 2. Non-numeric or format error
    if (!parsedH.isValid || !parsedW.isValid) {
      setFeedback({
        text: t.sizeInvalidNumber,
        type: 'error',
      });
      return;
    }

    const h = parsedH.value!;
    const w = parsedW.value!;

    // General realistic input boundaries
    if (h < 120 || h > 230 || w < 30 || w > 180) {
      setFeedback({
        text: t.sizeInvalidNumber,
        type: 'error',
      });
      return;
    }

    // 3. Reliable estimate range for DUTHUR sizing model
    if (h < 158 || w < 48 || h > 198 || w > 120) {
      setFeedback({
        text: t.sizeOutOfRange,
        type: 'warning',
      });
      return;
    }

    // 4. Recommendation algorithm
    const idx = (value: number, key: 'h' | 'w') =>
      sizes.reduce(
        (best, s, i) =>
          Math.abs(value - (s[key][0] + s[key][1]) / 2) <
          Math.abs(value - (sizes[best][key][0] + sizes[best][key][1]) / 2)
            ? i
            : best,
        0
      );

    const hIdx = idx(h, 'h');
    const wIdx = idx(w, 'w');
    const selected = sizes[Math.max(hIdx, wIdx)];

    setFeedback({
      text: `${t.recommended}: ${selected.name}`,
      type: 'recommended',
      size: selected.name,
    });
  }

  return (
    <div className="size-tool">
      <form
        className="size-form"
        onSubmit={(e) => {
          e.preventDefault();
          findSize();
        }}
      >
        <label>
          <span>{t.height}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={height}
            onChange={handleHeightChange}
            placeholder={locale === 'ar' ? 'مثال: ١٧٥' : 'e.g. 175'}
          />
        </label>

        <label>
          <span>{t.weight}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={weight}
            onChange={handleWeightChange}
            placeholder={locale === 'ar' ? 'مثال: ٧٢' : 'e.g. 72'}
          />
        </label>

        <button type="submit" className="primary size-submit-btn">
          {t.findSize}
        </button>

        {feedback && (
          <div
            className={`size-result size-result-${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.size && <span className="size-result-badge">{feedback.size}</span>}
            <span className="size-result-text">{feedback.text}</span>
          </div>
        )}

        <p className="muted">{t.sizeNote}</p>
      </form>

      <div className="table-wrap">
        <table className="size-table">
          <thead>
            <tr>
              <th>{t.tableSize}</th>
              <th>{t.tableLength}</th>
              <th>{t.tableChest}</th>
              <th>{t.tableSleeve}</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((s) => {
              const isMatch = feedback?.size === s.name;
              return (
                <tr key={s.name} className={isMatch ? 'row-recommended' : ''}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>
                    {s.length} {t.unitCm}
                  </td>
                  <td>
                    {s.chest} {t.unitCm}
                  </td>
                  <td>
                    {s.sleeve} {t.unitCm}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

