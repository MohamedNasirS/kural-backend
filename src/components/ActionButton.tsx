import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';

interface ActionButtonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export const ActionButton = ({ icon: Icon, title, description, href, onClick }: ActionButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <Card
      className="p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300 border-2 hover:border-primary group"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-4 rounded-full bg-accent group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon className="h-8 w-8" />
        </div>
        <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
};
