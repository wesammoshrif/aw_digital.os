import type { CSSProperties } from "react";

/**
 * AW Digital — brand mark (light theme).
 * ─────────────────────────────────────────────────────────────
 * The real monogram: an A and a W fused into one continuous stroke —
 * the A's right leg IS the W's first descender. Exactly ONE saturated
 * element: the A's crossbar in brand blue (the real AW logo hue). It is
 * the bar that makes the letter resolve AND the optical bridge of the
 * fusion. Everything else is architectural ink-grey.
 *
 * "digital" wordmark echoes the original: extralight, wide-tracked,
 * lowercase. "OS" is a quiet mono product tag.
 *
 * Quiet at rest; on hover the strokes deepen and the blue bar warms.
 */
export function Logo({
  collapsed = false,
  size = 32,
  tag = "OS",
}: {
  collapsed?: boolean;
  size?: number;
  tag?: string | null;
}) {
  return (
    <span
      className="group/logo inline-flex select-none items-center gap-[10px]"
      aria-label="AW digital"
      role="img"
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)]"
        style={
          {
            width: size,
            height: size,
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          } as CSSProperties
        }
      >
        <svg
          viewBox="0 0 49 42"
          width="66%"
          height="66%"
          fill="none"
          aria-hidden="true"
          className="overflow-visible"
        >
          <path
            d="M5 35 L16 7 L23 35 L29 17 L35 35 L44 7"
            stroke="var(--color-fg-dim)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-[stroke] duration-[var(--duration)] ease-[var(--ease-out)] group-hover/logo:stroke-[var(--color-fg)]"
          />
          <path
            d="M10 22 L20 22"
            stroke="var(--color-copper-500)"
            strokeWidth={3.2}
            strokeLinecap="round"
            className="transition-[stroke] duration-[var(--duration)] ease-[var(--ease-out)] group-hover/logo:stroke-[var(--color-copper-600)]"
          />
        </svg>
      </span>

      {!collapsed && (
        <span className="flex items-baseline gap-[8px] leading-none">
          <span
            className="text-[15px] font-extralight lowercase tracking-[0.26em] text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            digital
          </span>
          {tag && (
            <span
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-fg-mute)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {tag}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default Logo;
