import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'default' | 'destructive' | 'info';
  subtitle?: string;
  compact?: boolean;
}

const variantStyles = {
  primary: 'bg-gradient-primary text-primary-foreground',
  success: 'bg-gradient-success text-success-foreground',
  warning: 'bg-gradient-warning text-warning-foreground',
  destructive: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
  info: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
  default: 'bg-card text-card-foreground border',
};

export const StatCard = ({ title, value, icon: Icon, variant = 'default', subtitle, compact = false }: StatCardProps) => {
  return (
    <Card className={`${compact ? 'p-4' : 'p-5'} ${variantStyles[variant]} shadow-md hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${variant === 'default' ? 'text-muted-foreground' : 'opacity-90'} mb-1`}>
            {title}
          </p>
          <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold mb-0.5`}>{value}</h3>
          {subtitle && (
            <p className={`text-xs ${variant === 'default' ? 'text-muted-foreground' : 'opacity-75'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${compact ? 'p-2' : 'p-2.5'} rounded-lg ${variant === 'default' ? 'bg-accent' : 'bg-white/20'}`}>
          <Icon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
        </div>
      </div>
    </Card>
  );
};
