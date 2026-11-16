export function RestScene() {
      return (
        <svg
          className="mission-scene-svg mission-scene-rest"
          viewBox="0 0 280 240"
          fill="none"
          aria-hidden="true"
        >
          {/* Halo nocturno de cabina */}
          <rect
            x="16"
            y="20"
            width="248"
            height="196"
            rx="32"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="5"
          />

          {/* Trayectoria orbital */}
          <path
            d="M38 172 Q140 42 242 172"
            stroke="#5B6BFF"
            strokeWidth="3.5"
            strokeDasharray="8 8"
            strokeLinecap="round"
          />

          {/* Horizonte orbital inferior */}
          <path
            d="M18 184 Q140 154 262 184 V200 C262 210 254 214 242 214 H38 C26 214 18 210 18 200 Z"
            fill="#5B6BFF"
            opacity="0.35"
          />

          {/* Estrellas destellando */}
          <path
            className="scene-rest-star"
            d="M66 56 L70 66 L80 70 L70 74 L66 84 L62 74 L52 70 L62 66 Z"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            className="scene-rest-star"
            d="M214 52 L217 60 L225 63 L217 66 L214 74 L211 66 L203 63 L211 60 Z"
            fill="#FFFDF8"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle className="scene-rest-star" cx="106" cy="48" r="4.5" fill="#FFFDF8" />
          <circle className="scene-rest-star" cx="180" cy="76" r="4" fill="#FFB800" />
          <circle className="scene-rest-star" cx="226" cy="120" r="3.5" fill="#FFFDF8" />

          {/* Luna creciente cruzando en arco */}
          <g className="scene-rest-moon">
            <path
              d="M148 70 A34 34 0 1 0 174 128 A26 26 0 1 1 148 70 Z"
              fill="#FFB800"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <circle cx="132" cy="108" r="4" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2" />
            <circle cx="144" cy="122" r="3" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2" />
          </g>
        </svg>
      );
}
