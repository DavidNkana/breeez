import { Button } from './Button';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void } | { label: string; href: string };
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && <div className="mb-4 text-brand-400">{icon}</div>}
      <h3 className="text-base font-semibold text-brand-950">{title}</h3>
      {description && <p className="mt-1 text-sm text-brand-600 max-w-sm">{description}</p>}
      {action && (
        <div className="mt-4">
          {'href' in action ? (
            <a href={action.href}>
              <Button variant="primary">{action.label}</Button>
            </a>
          ) : (
            <Button onClick={action.onClick} variant="primary">{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}