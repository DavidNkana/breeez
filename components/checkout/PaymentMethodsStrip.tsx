/** Payment logos currently shown to customers at checkout. */

export const PAYMENT_METHODS = [
  {
    id: 'payfast',
    name: 'PayFast',
    alt: 'PayFast payment logo',
    src: 'https://payfast.io/wp-content/uploads/2024/12/Payfast-logo.svg',
    disabled: false,
  },
  {
    id: 'payjustnow',
    name: 'PayJustNow',
    alt: 'PayJustNow payment option',
    src: null,
    disabled: false,
  },
] as const;

export function PaymentMethodsStrip({
  size = 'md',
  showLabel = false,
  className = '',
  payJustNowEnabled = false,
}: {
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  payJustNowEnabled?: boolean;
}) {
  const iconHeight = size === 'sm' ? 18 : 32;
  const iconWidth = size === 'sm' ? 28 : 48;
  const gap = size === 'sm' ? 'gap-2' : 'gap-3';

  return (
    <div className={`flex flex-wrap items-center ${gap} ${className}`}>
      {PAYMENT_METHODS.map((method) => (
        <div
          key={method.id}
          title={method.alt}
          aria-label={method.alt}
            className={`inline-flex items-center justify-center rounded border border-brand-200 bg-white px-1.5 py-1 shadow-sm dark:border-brand-600 dark:bg-brand-800 ${method.disabled ? 'opacity-60' : ''}`}
          style={{ height: iconHeight + 8 }}
        >
          {method.src ? <img src={method.src} alt={method.alt} width={iconWidth} height={iconHeight} className="max-h-full w-auto max-w-full object-contain" /> : (
            <span className={`px-1 text-center text-[10px] font-semibold leading-tight text-brand-700 ${payJustNowEnabled ? '' : 'opacity-60'}`}>PayJustNow</span>
          )}
        </div>
      ))}
      {showLabel && (
        <span className="ml-2 text-xs text-brand-500">Secure checkout · 256-bit SSL</span>
      )}
    </div>
  );
}
