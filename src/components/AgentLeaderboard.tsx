import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Star } from 'lucide-react';

interface AgentLeaderboardProps {
  acNumber?: string;
}

// Mock data for agent leaderboard
const mockAgents = [
  { id: 1, name: 'Rajesh Kumar', surveys: 156, responseTime: 12, qualityScore: 98, rank: 1, trend: '+12%' },
  { id: 2, name: 'Priya Sharma', surveys: 145, responseTime: 15, qualityScore: 96, rank: 2, trend: '+8%' },
  { id: 3, name: 'Amit Patel', surveys: 138, responseTime: 14, qualityScore: 94, rank: 3, trend: '+5%' },
  { id: 4, name: 'Sanjay Reddy', surveys: 129, responseTime: 18, qualityScore: 92, rank: 4, trend: '+3%' },
  { id: 5, name: 'Meera Iyer', surveys: 122, responseTime: 16, qualityScore: 91, rank: 5, trend: '+7%' },
  { id: 6, name: 'Vikram Singh', surveys: 115, responseTime: 19, qualityScore: 89, rank: 6, trend: '-2%' },
  { id: 7, name: 'Deepa Nair', surveys: 108, responseTime: 17, qualityScore: 88, rank: 7, trend: '+4%' },
  { id: 8, name: 'Arjun Menon', surveys: 98, responseTime: 21, qualityScore: 85, rank: 8, trend: '-1%' },
  { id: 9, name: 'Lakshmi Das', surveys: 89, responseTime: 20, qualityScore: 83, rank: 9, trend: '+2%' },
  { id: 10, name: 'Karthik Rao', surveys: 82, responseTime: 22, qualityScore: 81, rank: 10, trend: '0%' },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-orange-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return 'Gold';
  if (rank === 2) return 'Silver';
  if (rank === 3) return 'Bronze';
  return null;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const AgentLeaderboard = ({ acNumber }: AgentLeaderboardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top 10 Agent Performers
        </h3>
        <Badge variant="outline" className="gap-1">
          <Star className="h-3 w-3 fill-primary text-primary" />
          This Month
        </Badge>
      </div>

      <div className="space-y-3">
        {mockAgents.map((agent) => {
          const badge = getRankBadge(agent.rank);
          return (
            <div
              key={agent.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                agent.rank <= 3 ? 'bg-primary/5 border-2 border-primary/20' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-10">
                {getRankIcon(agent.rank)}
              </div>

              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>

              {/* Agent Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{agent.name}</p>
                  {badge && (
                    <Badge
                      variant={agent.rank === 1 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {badge}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{agent.surveys} surveys</span>
                  <span>•</span>
                  <span>{agent.responseTime} min avg</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    Quality: {agent.qualityScore}%
                  </span>
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={`h-4 w-4 ${
                    agent.trend.startsWith('+') ? 'text-success' : agent.trend.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    agent.trend.startsWith('+') ? 'text-success' : agent.trend.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {agent.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Rankings based on survey completion, response time, and quality scores
        </p>
      </div>
    </Card>
  );
};
