import type { SVGProps } from "react";

const PLAY_PATH =
  "M74.35 37.8065C77 39.1265 77 42.9065 74.35 44.2265L5.2 81.6465C2.81 82.8465 0 81.1065 0 78.4365V3.59652C0 0.926518 2.81 -0.813481 5.2 0.386519L74.35 37.8065Z";

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 77 83" fill="currentColor" aria-hidden="true" {...props}>
      <path d={PLAY_PATH} />
    </svg>
  );
}
