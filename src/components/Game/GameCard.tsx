interface Props {
  children: React.ReactNode;
  className?: string;
}

const GameCard = ({ children, className }: Props) => {
  return <section className={`px-3.5 py-3 ${className}`}>{children}</section>;
};

export default GameCard;
