import type { ReactNode } from "react";

import { cx } from "../../lib/cx";

interface Props {
  children: ReactNode;
  className?: string;
}

const GameCard = ({ children, className }: Props) => {
  return <section className={cx("px-3.5 py-3", className)}>{children}</section>;
};

export default GameCard;
