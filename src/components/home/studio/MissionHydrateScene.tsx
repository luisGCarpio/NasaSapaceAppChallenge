export function HydrateScene() {
      return (
        <svg
          className="mission-scene-svg mission-scene-hydrate"
          viewBox="0 0 240 280"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="mission-hydrate-tank-clip">
              <rect x="66" y="64" width="108" height="164" rx="22" />
            </clipPath>
          </defs>

          {/* Válvula superior del tanque */}
          <rect
            x="92"
            y="24"
            width="56"
            height="18"
            rx="7"
            fill="#FF5A26"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
          <rect
            x="104"
            y="42"
            width="32"
            height="14"
            rx="4"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="4"
          />

          {/* Carcasa exterior */}
          <rect
            x="56"
            y="54"
            width="128"
            height="184"
            rx="28"
            fill="#EFE9DC"
            stroke="#1C1917"
            strokeWidth="5"
          />
          <rect
            x="66"
            y="64"
            width="108"
            height="164"
            rx="22"
            fill="#2A2845"
          />

          {/* Líquido animado y burbujas */}
          <g clipPath="url(#mission-hydrate-tank-clip)">
            <g className="scene-hydrate-liquid">
              <path
                d="M62 72 Q92 60 120 72 T178 72 V234 H62 Z"
                fill="#38BDF8"
                stroke="#1C1917"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M62 128 H178 V234 H62 Z"
                fill="#5B6BFF"
                opacity="0.35"
              />
              <rect
                x="78"
                y="92"
                width="10"
                height="112"
                rx="5"
                fill="#FFFDF8"
                opacity="0.45"
              />
            </g>

            <circle
              className="scene-hydrate-bubble"
              cx="98"
              cy="194"
              r="7"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="142"
              cy="176"
              r="9"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="118"
              cy="146"
              r="5.5"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="148"
              cy="122"
              r="5"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2"
            />
          </g>

          {/* Borde interior del visor y marcas de medida */}
          <rect
            x="66"
            y="64"
            width="108"
            height="164"
            rx="22"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
          <line x1="66" y1="106" x2="84" y2="106" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
          <line x1="66" y1="146" x2="90" y2="146" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
          <line x1="66" y1="186" x2="84" y2="186" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />

          {/* Base del tanque */}
          <rect
            x="76"
            y="238"
            width="88"
            height="16"
            rx="8"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
        </svg>
      );
}
