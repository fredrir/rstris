interface Props {
  children: React.ReactNode;
}

const GamePanel = ({ children }: Props) => {
  return <aside className="flex min-h-0 flex-col gap-3">{children}</aside>;
};

export default GamePanel;
