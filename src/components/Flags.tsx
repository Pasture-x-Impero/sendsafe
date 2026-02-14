export const NorwayFlag = () => (
  <svg className="h-4 w-5 shrink-0 rounded-[2px]" viewBox="0 0 22 16" fill="none">
    <rect width="22" height="16" fill="#BA0C2F" />
    <rect x="6" width="4" height="16" fill="#fff" />
    <rect y="6" width="22" height="4" fill="#fff" />
    <rect x="7" width="2" height="16" fill="#00205B" />
    <rect y="7" width="22" height="2" fill="#00205B" />
  </svg>
);

export const UKFlag = () => (
  <svg className="h-4 w-5 shrink-0 rounded-[2px]" viewBox="0 0 60 30" fill="none">
    <clipPath id="uk"><rect width="60" height="30" /></clipPath>
    <g clipPath="url(#uk)">
      <rect width="60" height="30" fill="#00247D" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#CF142B" strokeWidth="4" clipPath="url(#uk)" />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#CF142B" strokeWidth="6" />
    </g>
  </svg>
);
