/* Built-in abstract artwork for the image trail: eight small compositions drawn with the theme tokens (no photos, no external files). */

export const ART_COUNT = 8;

export function TrailArt({ index }: { index: number }) {
  const v = index % ART_COUNT;
  const P = 'var(--primary, #2563eb)', S = 'var(--signal, #f59e0b)';
  const bg = ['#0f172a', '#f8fafc', '#111827', '#fef3c7', '#0b1020', '#e0e7ff', '#1e1b4b', '#fff7ed'][v]!;
  const dark = [0, 2, 4, 6].includes(v);
  const ink = dark ? '#ffffff' : '#0f172a';
  return (
    <svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">
      <rect width="80" height="100" fill={bg} />
      {v === 0 && (<><circle cx="40" cy="42" r="26" fill={S} /><rect x="0" y="62" width="80" height="38" fill={P} opacity="0.9" /><circle cx="40" cy="42" r="26" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.5" /></>)}
      {v === 1 && (<><path d="M0 100 V46 Q40 -4 80 46 V100Z" fill={P} /><circle cx="40" cy="56" r="12" fill={S} /></>)}
      {v === 2 && (<>{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={8 + i * 11} y={70 - i * 10} width="8" height={30 + i * 10} fill={i % 2 ? S : P} />)}</>)}
      {v === 3 && (<><circle cx="26" cy="34" r="22" fill={P} opacity="0.9" /><circle cx="52" cy="62" r="24" fill={S} opacity="0.9" style={{ mixBlendMode: 'multiply' }} /></>)}
      {v === 4 && (<>{[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((c) => <circle key={r * 4 + c} cx={14 + c * 17} cy={16 + r * 17} r={2 + ((r + c) % 3) * 1.6} fill={(r + c) % 2 ? S : P} />))}</>)}
      {v === 5 && (<><path d="M0 70 L40 14 L80 70Z" fill={P} /><path d="M0 100 L30 62 L56 100Z" fill={S} /></>)}
      {v === 6 && (<><circle cx="40" cy="50" r="30" fill="none" stroke={P} strokeWidth="10" /><circle cx="40" cy="50" r="12" fill={S} /></>)}
      {v === 7 && (<>{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x="-10" y={8 + i * 14} width="100" height="6" fill={i % 2 ? S : P} transform={`rotate(-18 40 50)`} />)}</>)}
    </svg>
  );
}
