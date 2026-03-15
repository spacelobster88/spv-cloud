export default function Logo({ className = '', size = 48 }: { className?: string; size?: number }) {
  const w = size;
  const h = size * 0.85;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 170"
      width={w}
      height={h}
      className={className}
      aria-label="SPV Cloud Logo"
    >
      {/* Truck body - geometric polygon style */}
      <polygon
        points="30,130 30,60 130,60 130,40 170,40 170,130"
        fill="#1B2B4B"
      />
      {/* Cab windshield area */}
      <polygon
        points="132,60 132,45 165,45 165,60"
        fill="#2D8CA0"
        opacity="0.6"
      />
      {/* Geometric facets on truck body */}
      <polygon points="30,60 80,60 55,95" fill="#2D8CA0" opacity="0.4" />
      <polygon points="80,60 130,60 105,95" fill="#3AAFC9" opacity="0.3" />
      <polygon points="30,95 55,95 30,130" fill="#2D8CA0" opacity="0.25" />
      <polygon points="55,95 105,95 80,130" fill="#3AAFC9" opacity="0.2" />
      <polygon points="105,95 130,60 130,130" fill="#2D8CA0" opacity="0.3" />

      {/* Wheels */}
      <circle cx="65" cy="135" r="16" fill="#0F1B2D" />
      <circle cx="65" cy="135" r="8" fill="#E8EDF2" />
      <circle cx="150" cy="135" r="16" fill="#0F1B2D" />
      <circle cx="150" cy="135" r="8" fill="#E8EDF2" />

      {/* Ground line */}
      <line x1="20" y1="151" x2="180" y2="151" stroke="#1B2B4B" strokeWidth="2" />

      {/* Cloud shape */}
      <g transform="translate(55, 30)">
        <ellipse cx="30" cy="20" rx="22" ry="16" fill="white" opacity="0.95" />
        <ellipse cx="15" cy="25" rx="14" ry="11" fill="white" opacity="0.95" />
        <ellipse cx="45" cy="25" rx="14" ry="11" fill="white" opacity="0.95" />
      </g>

      {/* Circuit nodes and lines */}
      <g stroke="#2D8CA0" strokeWidth="2" fill="none">
        <line x1="20" y1="80" x2="45" y2="80" />
        <line x1="20" y1="95" x2="40" y2="95" />
        <line x1="25" y1="110" x2="45" y2="110" />
        <line x1="45" y1="80" x2="55" y2="95" />
        <line x1="55" y1="95" x2="45" y2="110" />
      </g>
      {/* Circuit node dots */}
      <circle cx="20" cy="80" r="4" fill="#2D8CA0" />
      <circle cx="20" cy="95" r="4" fill="#2D8CA0" />
      <circle cx="25" cy="110" r="4" fill="#2D8CA0" />
      <circle cx="45" cy="80" r="3" fill="#3AAFC9" />
      <circle cx="55" cy="95" r="4" fill="#3AAFC9" />
      <circle cx="45" cy="110" r="3" fill="#3AAFC9" />
    </svg>
  );
}
