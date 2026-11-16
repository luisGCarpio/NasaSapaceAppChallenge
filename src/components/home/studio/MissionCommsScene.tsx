export function CommsScene() {
      return (
        <svg
          className="mission-scene-svg mission-scene-comms"
          viewBox="0 0 280 240"
          fill="none"
          aria-hidden="true"
        >
          {/* Tierra en la esquina inferior derecha */}
          <path
            d="M168 220 A76 76 0 0 1 258 148 V220 Z"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M196 220 C198 196, 214 184, 232 184 C242 184, 250 176, 256 168 V220 Z"
            fill="#38BDF8"
            stroke="#1C1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle
            cx="224"
            cy="192"
            r="7"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="3"
          />

          {/* 3 ondas concéntricas emitidas hacia Tierra */}
          <path
            className="scene-comms-wave"
            d="M124 98 A28 28 0 0 1 102 132"
            stroke="#FFB800"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            className="scene-comms-wave"
            d="M148 106 A52 52 0 0 1 114 156"
            stroke="#FF5A26"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            className="scene-comms-wave"
            d="M174 114 A76 76 0 0 1 128 182"
            stroke="#38BDF8"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Satélite / antena parabólica */}
          <g className="scene-comms-dish">
            {/* Paneles solares */}
            <rect
              x="26"
              y="46"
              width="38"
              height="22"
              rx="5"
              transform="rotate(-24 26 46)"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="4"
            />
            <rect
              x="92"
              y="18"
              width="38"
              height="22"
              rx="5"
              transform="rotate(-24 92 18)"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="4"
            />
            {/* Cuerpo satélite */}
            <rect
              x="60"
              y="42"
              width="34"
              height="34"
              rx="8"
              transform="rotate(-24 60 42)"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="4.5"
            />
            {/* Plato parabólico */}
            <path
              d="M54 94 C72 114, 108 106, 118 80 L76 62 Z"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <line
              x1="92"
              y1="82"
              x2="106"
              y2="98"
              stroke="#1C1917"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle
              cx="108"
              cy="100"
              r="7"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
          </g>
        </svg>
      );
}
