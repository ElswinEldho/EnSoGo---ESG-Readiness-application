// EnSoGo logo — vector recreation matching the brand mark:
// a green circular brushstroke wrapping a leaf, buildings, and a wind turbine
// over a stylised water curve.
//
// Use <Logo /> wherever you need the icon. Size with className="w-N h-N".
// If you upload an actual PNG/JPG logo to /public/logo.png, set USE_IMG_FALLBACK
// below to true to render it instead.

const USE_IMG_FALLBACK = true;

export default function Logo({ className = 'w-10 h-10' }) {
  if (USE_IMG_FALLBACK) {
    return <img src="/EnSoGo%20Logo.png" alt="EnSoGo" className={className} />;
  }
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="EnSoGo logo">
      {/* Outer green brushstroke ring */}
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cc48d" />
          <stop offset="55%" stopColor="#2b8c4f" />
          <stop offset="100%" stopColor="#164e2a" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cc48d" />
          <stop offset="100%" stopColor="#1f6f3c" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3c83d3" />
          <stop offset="100%" stopColor="#10325d" />
        </linearGradient>
      </defs>

      {/* Brush ring */}
      <path
        d="M100,18 C160,18 182,55 182,100 C182,148 145,182 100,182 C58,182 18,150 18,100 C18,55 50,18 100,18 Z"
        fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray="430 90"
        transform="rotate(-15 100 100)"
      />

      {/* Hills */}
      <path d="M22,130 C55,108 95,140 130,118 C150,108 170,118 178,128 L178,150 L22,150 Z" fill="#a8dcb4" />

      {/* Leaf (left) */}
      <path
        d="M55,140 C50,100 65,75 95,72 C90,100 80,128 55,140 Z"
        fill="url(#leafGrad)"
      />
      <path d="M62,132 C70,115 80,98 92,82" stroke="#0f3d1f" strokeWidth="1.5" fill="none" />

      {/* Buildings (centre) */}
      <g>
        <rect x="92" y="80" width="14" height="50" fill="#cfd8dc" stroke="#1f6f3c" strokeWidth="1.5" />
        <rect x="108" y="65" width="14" height="65" fill="#dde6ea" stroke="#1f6f3c" strokeWidth="1.5" />
        <rect x="124" y="92" width="12" height="38" fill="#cfd8dc" stroke="#1f6f3c" strokeWidth="1.5" />
        {/* Windows */}
        {[88, 96, 104, 112, 120].map((y) => (
          <g key={y}>
            <rect x="95" y={y} width="2" height="2" fill="#1f6f3c" />
            <rect x="100" y={y} width="2" height="2" fill="#1f6f3c" />
            <rect x="111" y={y - 8} width="2" height="2" fill="#1f6f3c" />
            <rect x="116" y={y - 8} width="2" height="2" fill="#1f6f3c" />
          </g>
        ))}
      </g>

      {/* Wind turbine (right) */}
      <line x1="155" y1="130" x2="155" y2="82" stroke="#1f6f3c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="155" cy="82" r="3" fill="#1f6f3c" />
      <g transform="rotate(0 155 82)">
        <ellipse cx="155" cy="68" rx="2" ry="14" fill="#1f6f3c" />
        <ellipse cx="167" cy="89" rx="14" ry="2" fill="#1f6f3c" transform="rotate(35 167 89)" />
        <ellipse cx="143" cy="89" rx="14" ry="2" fill="#1f6f3c" transform="rotate(-35 143 89)" />
      </g>

      {/* Water curve at the bottom */}
      <path
        d="M22,150 C60,168 110,140 178,158 L178,182 L22,182 Z"
        fill="url(#waterGrad)"
      />
    </svg>
  );
}

// Wordmark component (logo + "EnSoGo" text), reusable in headers.
export function Wordmark({ size = 'md' }) {
  const cls = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const textCls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <div className="flex items-center gap-2.5">
      <Logo className={cls} />
      <div className="leading-tight">
        <div className={`${textCls} font-bold tracking-tight text-ensogo-900`}>
          EnSoGo
        </div>
        <div className="text-[10px] uppercase tracking-wider text-navy-700 -mt-0.5">
          Sustainability Readiness
        </div>
      </div>
    </div>
  );
}
