/**
 * CSS Houdini Paint Worklet for superellipse ("squircle") corner smoothing.
 *
 * Registers a `squircle` paint worklet that draws a filled superellipse-
 * rounded rectangle. Use it as a mask to clip elements to smooth corners:
 *
 *   mask-image: paint(squircle);
 *
 * Controlled via CSS custom properties:
 *   --squircle-smooth  (0–1, default 0.6)  – how much to smooth
 *
 * The worklet reads the element's computed border-radius per-corner.
 * When a corner radius is large enough to form a full pill shape, the
 * worklet automatically falls back to circular arcs to preserve pills.
 */

const WORKLET_SOURCE = /* js */ `
class SquirclePainter {
  static get inputProperties() {
    return [
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      '--squircle-smooth',
    ];
  }

  paint(ctx, size, props) {
    const w = size.width;
    const h = size.height;

    const parse = (v) => {
      const s = String(v);
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    let tl = parse(props.get('border-top-left-radius'));
    let tr = parse(props.get('border-top-right-radius'));
    let br = parse(props.get('border-bottom-right-radius'));
    let bl = parse(props.get('border-bottom-left-radius'));

    const smooth = parse(props.get('--squircle-smooth')) || 1;

    // No radius → full rectangle, no clipping needed
    if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Clamp radii so they don't exceed half the width/height
    const maxR = Math.min(w, h) / 2;
    tl = Math.min(tl, maxR);
    tr = Math.min(tr, maxR);
    br = Math.min(br, maxR);
    bl = Math.min(bl, maxR);

    // Superellipse exponent: n=2 is circular, higher → squircle
    // For pill-shaped corners (radius ≈ maxR), stay circular
    const nFor = (r) => {
      if (r === 0) return 2;
      const ratio = r / maxR;
      return ratio > 0.85 ? 2 : 2 + smooth * 3;
    };

    const STEPS = 32; // segments per corner arc

    ctx.beginPath();
    ctx.moveTo(tl, 0);

    // ── Top edge ──
    ctx.lineTo(w - tr, 0);

    // ── Top-right corner ──
    this._corner(ctx, w - tr, tr, tr, -Math.PI / 2, 0, nFor(tr), STEPS);

    // ── Right edge ──
    ctx.lineTo(w, h - br);

    // ── Bottom-right corner ──
    this._corner(ctx, w - br, h - br, br, 0, Math.PI / 2, nFor(br), STEPS);

    // ── Bottom edge ──
    ctx.lineTo(bl, h);

    // ── Bottom-left corner ──
    this._corner(ctx, bl, h - bl, bl, Math.PI / 2, Math.PI, nFor(bl), STEPS);

    // ── Left edge ──
    ctx.lineTo(0, tl);

    // ── Top-left corner ──
    this._corner(ctx, tl, tl, tl, Math.PI, Math.PI * 1.5, nFor(tl), STEPS);

    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  _corner(ctx, cx, cy, r, startAngle, endAngle, n, steps) {
    if (r <= 0) return;
    for (let i = 0; i <= steps; i++) {
      const t = startAngle + (endAngle - startAngle) * (i / steps);
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      const x = cx + Math.sign(cosT) * r * Math.pow(Math.abs(cosT), 2 / n);
      const y = cy + Math.sign(sinT) * r * Math.pow(Math.abs(sinT), 2 / n);
      ctx.lineTo(x, y);
    }
  }
}

registerPaint('squircle', SquirclePainter);
`;

let registered = false;

/**
 * Register the squircle paint worklet (idempotent, Chrome-only).
 * Safe to call in any environment — silently no-ops when the Paint API
 * is unavailable.
 */
export function registerSquircle(): void {
  if (registered) return;
  if (typeof CSS === "undefined" || !("paintWorklet" in CSS)) {
    return; // Paint API not available (Firefox, Safari, SSR)
  }

  try {
    const blob = new Blob([WORKLET_SOURCE], {
      type: "text/javascript",
    });
    const url = URL.createObjectURL(blob);
    // @ts-ignore – paintWorklet is not in the TS lib types
    (CSS.paintWorklet as any).addModule(url).then(() => {
      registered = true;
      document.documentElement.classList.add("squircle-ready");
    }).catch(() => {
      // CSP in Chrome extensions blocks blob: worklet modules — degrade gracefully
    });
  } catch {
    // Silently fail — elements will keep normal border-radius
  }
}