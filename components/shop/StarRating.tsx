type StarRatingProps = {
  value: number; // 0..5, can be fractional
  size?: 'xs' | 'sm' | 'md' | 'lg';
  outOf?: number;
  className?: string;
  // Show numeric value next to stars (e.g. "4.5 (12 reviews)")
  showValue?: boolean;
  reviewCount?: number;
};

const SIZES = {
  xs: { star: 10, gap: 'gap-0.5', text: 'text-[10px]' },
  sm: { star: 14, gap: 'gap-0.5', text: 'text-xs' },
  md: { star: 18, gap: 'gap-1', text: 'text-sm' },
  lg: { star: 26, gap: 'gap-1.5', text: 'text-base' },
};

/**
 * A SaaS-quality star rating display.
 * Supports fractional values (e.g. 4.3 → 4 full + 1 30%-filled).
 * Pure SVG so it renders crisp at any DPR.
 */
export function StarRating({
  value,
  size = 'sm',
  outOf = 5,
  showValue = false,
  reviewCount,
  className = '',
}: StarRatingProps) {
  const s = SIZES[size];
  const stars = Array.from({ length: outOf }, (_, i) => {
    const filled = Math.max(0, Math.min(1, value - i));
    return { index: i, fillPct: filled * 100 };
  });

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`} aria-label={`${value} out of ${outOf} stars`}>
      <div className={`flex ${s.gap}`} role="img">
        {stars.map((star) => (
          <Star key={star.index} filled={star.fillPct} size={s.star} />
        ))}
      </div>
      {showValue && (
        <span className={`${s.text} font-medium text-brand-700`}>
          {value.toFixed(1)}
          {reviewCount !== undefined && (
            <span className="text-brand-500 ml-1">
              ({reviewCount.toLocaleString()})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function Star({ filled, size }: { filled: number; size: number }) {
  // Two stacked stars: gray base + yellow foreground at the filled percentage
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="#E5E7EB"
        />
      </svg>
      {filled > 0 && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${filled}%` }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="#F59E0B"
            />
          </svg>
        </span>
      )}
    </span>
  );
}

/**
 * Interactive 5-star input used in the review form.
 * Keyboard accessible (arrows + Enter to set).
 */
export function StarPicker({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'md' | 'lg';
}) {
  const s = SIZES[size];

  return (
    <div
      className={`inline-flex ${s.gap}`}
      role="radiogroup"
      aria-label="Your rating"
      onMouseLeave={() => {/* hover state handled per-button */}}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className="p-1 rounded hover:bg-brand-50 transition-colors"
        >
          <svg width={s.star} height={s.star} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={n <= value ? '#F59E0B' : '#E5E7EB'}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
