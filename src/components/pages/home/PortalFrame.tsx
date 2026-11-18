import { useId } from 'react';

export default function PortalFrame() {
  const id = useId();
  const stoneId = `${id}-stone`;
  const brassId = `${id}-brass`;

  return (
    <svg
      className="portal-home__frame"
      viewBox="0 0 900 1040"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={true}
      focusable={false}
    >
      <defs>
        {/* Stone Gradient */}
        <linearGradient id={stoneId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#172821" />
          <stop offset="50%" stopColor="#465044" />
          <stop offset="100%" stopColor="#202c25" />
        </linearGradient>

        {/* Brass Gradient */}
        <linearGradient id={brassId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b89c6e" />
          <stop offset="50%" stopColor="#d4c4a0" />
          <stop offset="100%" stopColor="#b89c6e" />
        </linearGradient>
      </defs>

      {/* Main Compound Path: Stone Arch with Transparent Center */}
      <path
        d={`${outer} ${inner}`}
        fillRule="evenodd"
        fill={`url(#${stoneId})`}
      />

      {/* Outer Outline (Beveled Bands) */}
      <path
        d={outer}
        fill="none"
        stroke="#162722"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Inner Brass Rim */}
      <path
        d="M113 1040V425C113 247 241 130 450 45C659 130 787 247 787 425V1040"
        fill="none"
        stroke="#76816a"
        strokeOpacity=".3"
        strokeWidth="3"
      />
      <path
        d="M180 1040V425C180 280 285 170 450 97C615 170 720 280 720 425V1040"
        fill="none"
        stroke="#0c1912"
        strokeWidth="7"
      />
      <path
        d={inner}
        fill="none"
        stroke={`url(#${brassId})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Vertical Pillar Seams */}
      <g>
        <path d="M90 550H198" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M90 700H198" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M90 850H198" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M90 1000H198" fill="none" stroke="#202c25" strokeWidth="2" />

        <path d="M702 550H810" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M702 700H810" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M702 850H810" fill="none" stroke="#202c25" strokeWidth="2" />
        <path d="M702 1000H810" fill="none" stroke="#202c25" strokeWidth="2" />
      </g>

      {/* Radial Arch Seams */}
      <g>
        <line x1="110" y1="330" x2="215" y2="345" stroke="#202c25" strokeWidth="1.5" />
        <line x1="175" y1="205" x2="255" y2="265" stroke="#202c25" strokeWidth="1.5" />
        <line x1="290" y1="110" x2="335" y2="190" stroke="#202c25" strokeWidth="1.5" />
        <line x1="450" y1="25" x2="450" y2="112" stroke="#202c25" strokeWidth="1.5" />

        {/* Mirror for right side */}
        <line x1="790" y1="330" x2="685" y2="345" stroke="#202c25" strokeWidth="1.5" />
        <line x1="725" y1="205" x2="645" y2="265" stroke="#202c25" strokeWidth="1.5" />
        <line x1="610" y1="110" x2="565" y2="190" stroke="#202c25" strokeWidth="1.5" />
      </g>

      {/* Keystone */}
      <path d="M421 34L479 34L470 126L430 126Z" fill="#172821" stroke="#b89c6e" strokeWidth="1" />

      {/* Abstract Diamond Markings on Pillars */}
      <g>
        <path d="M105 565L115 575L105 585L95 575Z" fill="#202c25" stroke="none" />
        <path d="M785 565L795 575L785 585L775 575Z" fill="#202c25" stroke="none" />

        <path d="M105 715L115 725L105 735L95 725Z" fill="#202c25" stroke="none" />
        <path d="M785 715L795 725L785 735L775 725Z" fill="#202c25" stroke="none" />

        <path d="M105 865L115 875L105 885L95 875Z" fill="#202c25" stroke="none" />
        <path d="M785 865L795 875L785 885L775 875Z" fill="#202c25" stroke="none" />

        <path d="M105 1015L115 1025L105 1035L95 1025Z" fill="#202c25" stroke="none" />
        <path d="M785 1015L795 1025L785 1035L775 1025Z" fill="#202c25" stroke="none" />
      </g>
    </svg>
  );
}

const outer = 'M90 1040V425C90 230 225 110 450 20C675 110 810 230 810 425V1040Z';
const inner = 'M198 1040V425C198 292 294 190 450 118C606 190 702 292 702 425V1040Z';
