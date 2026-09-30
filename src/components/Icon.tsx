const PATHS = {
  home: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  list: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  sliders: <path d="M5 7h9M18 7h1M5 17h1M10 17h9M16 5v4M8 15v4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />,
  food: <path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M17 3c-2 2-2 6 0 8v10" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 14.5a4 4 0 0 0 6 0M9.5 10h.01M14.5 10h.01" />
    </>
  ),
  star: <path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
