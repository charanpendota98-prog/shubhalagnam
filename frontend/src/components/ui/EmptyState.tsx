import type { ReactNode } from "react";

/**
 * EmptyState — the designed "nothing here yet" surface.
 *
 * An empty state must say what is empty, why, and what to do next. It never
 * invents content to fill the gap: caller-supplied copy only.
 */

type Props = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: Props) {
  return (
    <div className={`ds-empty ${className}`.trim()}>
      {icon && (
        <span className="ds-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="ds-empty__title">{title}</p>
      {description && <p className="ds-empty__text">{description}</p>}
      {action && <div className="ds-empty__action">{action}</div>}
    </div>
  );
}
