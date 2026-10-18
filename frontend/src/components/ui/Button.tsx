import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Button — the shared action control.
 *
 * Design-system rules baked in so no call-site has to remember them:
 * • `type="button"` by default (a bare <button> inside a <form> submits it).
 * • 44px minimum touch target on every variant and size.
 * • Loading state announces `aria-busy` and blocks re-submission.
 * • Focus ring comes from the global `:focus-visible` rule, plus a
 *   token-based ring on the control itself.
 *
 * Pass `href` to render a Next.js <Link> with identical visual states.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "light";
export type ButtonSize = "md" | "lg";

type ControlProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = ControlProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };

type AsLink = ControlProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & { href: string };

export type ButtonProps = AsButton | AsLink;

/** Strips design-system-only props before they reach the DOM. */
function domProps<T extends Record<string, unknown>>(props: T): Record<string, unknown> {
  const {
    variant: _variant,
    size: _size,
    block: _block,
    loading: _loading,
    iconLeft: _iconLeft,
    iconRight: _iconRight,
    className: _className,
    children: _children,
    ...rest
  } = props;
  return rest;
}

export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    iconLeft,
    iconRight,
    className = "",
    children,
  } = props;

  const classes = [
    "ds-btn",
    `ds-btn--${variant}`,
    size === "lg" ? "ds-btn--lg" : "",
    block ? "ds-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <span className="ds-btn__spinner" aria-hidden="true" /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </>
  );

  if (typeof props.href === "string" && props.href.length > 0) {
    const linkProps = props as AsLink;
    const disabled = loading || Boolean(linkProps["aria-disabled"]);
    return (
      <Link
        href={linkProps.href}
        className={classes}
        data-loading={loading ? "true" : undefined}
        aria-disabled={disabled ? true : undefined}
        {...domProps(props as unknown as Record<string, unknown>)}
      >
        {content}
      </Link>
    );
  }

  const buttonProps = props as AsButton;
  return (
    <button
      {...domProps(buttonProps as unknown as Record<string, unknown>)}
      className={classes}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading ? true : undefined}
      aria-disabled={loading ? true : undefined}
      /* Never let a caller's absent `type` fall back to the implicit
         "submit" default — that silently submits the enclosing form. */
      type={buttonProps.type ?? "button"}
    >
      {content}
    </button>
  );
}
