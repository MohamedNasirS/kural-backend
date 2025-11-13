import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'default';
  subtitle?: string;
}

const variantStyles = {
  primary: 'bg-gradient-primary text-primary-foreground',
  success: 'bg-gradient-success text-success-foreground',
  warning: 'bg-gradient-warning text-warning-foreground',
  default: 'bg-card text-card-foreground border',
};

export const StatCard = ({ title, value, icon: Icon, variant = 'default', subtitle }: StatCardProps) => {
  return (
    <Card className={`p-6 ${variantStyles[variant]} shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${variant === 'default' ? 'text-muted-foreground' : 'opacity-90'} mb-2`}>
            {title}
          </p>
          <h3 className="text-3xl font-bold mb-1">{value}</h3>
          {subtitle && (
            <p className={`text-xs ${variant === 'default' ? 'text-muted-foreground' : 'opacity-75'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${variant === 'default' ? 'bg-accent' : 'bg-white/20'}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
