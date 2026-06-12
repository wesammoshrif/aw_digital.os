import { cn } from "@/lib/utils";
import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/* Apple buttons: pill-shaped, system blue, lighten on hover. */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-copper-500)] text-white hover:bg-[#0077ed] active:bg-[var(--color-copper-600)]",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-surface-3)]",
  ghost:
    "text-[var(--color-copper-600)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[#fff0ef] text-[var(--color-danger)] hover:bg-[#ffe4e2]",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-3.5 text-[12.5px] gap-1.5 rounded-full",
  md: "h-9 px-4.5 text-[13.5px] gap-1.5 rounded-full",
  lg: "h-11 px-6 text-[15px] gap-2 rounded-full",
};

type CommonProps = { variant?: Variant; size?: Size; className?: string };
type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;
type LinkProps = CommonProps & { href: string; children: React.ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...rest}
      />
    );
  },
);

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  href,
  children,
}: LinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors duration-150",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
