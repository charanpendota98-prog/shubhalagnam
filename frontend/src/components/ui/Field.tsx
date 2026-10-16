import type { ReactNode } from "react";

/**
 * Field — label + control + hint/error with the ARIA wiring done once.
 *
 * The control is supplied through a render prop so it keeps its own element
 * (`input`, `select`, `textarea`, or a custom control) while still receiving
 * the generated `id`, `aria-describedby` and `aria-invalid` wiring.
 *
 * Usage:
 * ```tsx
 * <Field id="age" label="Age range" hint="Adults only" error={error}>
 *   {({ controlId, describedBy, invalid }) => (
 *     <select id={controlId} className="ds-control" aria-describedby={describedBy} aria-invalid={invalid}>
 *       ...
 *     </select>
 *   )}
 * </Field>
 * ```
 */

export type FieldRenderProps = {
  /** id for the control itself — matches the label's htmlFor. */
  controlId: string;
  /** space-separated ids of the hint/error text, or undefined when neither exists. */
  describedBy?: string;
  /** true when an error message is present. */
  invalid: boolean;
};

type Props = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
};

export default function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}: Props) {
  const controlId = `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ds-field ${className}`.trim()}>
      <label className="ds-field__label" htmlFor={controlId}>
        {label}
        {required && (
          <span className="ds-field__required" aria-hidden="true">
            {" *"}
          </span>
        )}
        {required && <span className="ds-sr-only"> (required)</span>}
      </label>
      {children({ controlId, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p className="ds-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ds-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
