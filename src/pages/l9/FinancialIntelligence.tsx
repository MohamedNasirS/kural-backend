import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { DollarSign, TrendingUp, PieChart as PieChartIcon, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const expenseBreakdown = [
  { category: 'Digital Advertising', spent: 4500000, budget: 5000000, roi: 3.2 },
  { category: 'Ground Operations', spent: 3800000, budget: 4200000, roi: 4.5 },
  { category: 'Media & PR', spent: 2900000, budget: 3500000, roi: 2.8 },
  { category: 'Events & Rallies', spent: 2200000, budget: 2500000, roi: 3.7 },
  { category: 'Print Materials', spent: 1500000, budget: 1800000, roi: 2.1 },
  { category: 'Logistics', spent: 1800000, budget: 2000000, roi: 1.9 },
];

const spendingTrend = [
  { week: 'Week 1', spent: 850000, planned: 900000 },
  { week: 'Week 2', spent: 920000, planned: 950000 },
  { week: 'Week 3', spent: 1100000, planned: 1050000 },
  { week: 'Week 4', spent: 980000, planned: 1000000 },
  { week: 'Week 5', spent: 1150000, planned: 1200000 },
];

const roiMetrics = [
  { name: 'Cost per Vote', value: 12.5 },
  { name: 'Cost per Contact', value: 3.2 },
  { name: 'Cost per Conversion', value: 45.8 },
  { name: 'Digital CPM', value: 280 },
];

const categoryColors = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
];

const FinancialIntelligence = () => {
  const totalSpent = expenseBreakdown.reduce((sum, item) => sum + item.spent, 0);
  const totalBudget = expenseBreakdown.reduce((sum, item) => sum + item.budget, 0);
  const utilizationRate = ((totalSpent / totalBudget) * 100).toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial & Budget Intelligence</h1>
          <p className="text-muted-foreground mt-2">Real-time budget tracking and ROI analysis</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Budget" 
            value={`₹${(totalBudget / 1000000).toFixed(1)}M`} 
            icon={DollarSign} 
            variant="primary" 
          />
          <StatCard 
            title="Total Spent" 
            value={`₹${(totalSpent / 1000000).toFixed(1)}M`} 
            icon={TrendingUp} 
            variant="success"
            subtitle={`${utilizationRate}% utilized`}
          />
          <StatCard title="Avg ROI" value="3.2x" icon={Target} subtitle="Return on investment" />
          <StatCard title="Cost per Vote" value="₹12.5" icon={PieChartIcon} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, spent }) => `${category}: ₹${(spent / 1000000).toFixed(1)}M`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="spent"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${(value / 1000000).toFixed(2)}M`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spending Trend (Weekly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Legend />
                  <Line type="monotone" dataKey="spent" stroke="hsl(var(--primary))" name="Actual Spent" strokeWidth={2} />
                  <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" name="Planned" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Budget Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-right p-3">Spent</th>
                    <th className="text-right p-3">Remaining</th>
                    <th className="text-right p-3">Utilization</th>
                    <th className="text-right p-3">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseBreakdown.map((item) => {
                    const remaining = item.budget - item.spent;
                    const utilization = ((item.spent / item.budget) * 100).toFixed(1);
                    return (
                      <tr key={item.category} className="border-b hover:bg-accent/50">
                        <td className="p-3 font-medium">{item.category}</td>
                        <td className="text-right p-3">₹{(item.budget / 1000000).toFixed(2)}M</td>
                        <td className="text-right p-3">₹{(item.spent / 1000000).toFixed(2)}M</td>
                        <td className="text-right p-3">₹{(remaining / 1000000).toFixed(2)}M</td>
                        <td className="text-right p-3">
                          <span className={`${Number(utilization) > 90 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {utilization}%
                          </span>
                        </td>
                        <td className="text-right p-3 font-semibold text-success">{item.roi}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancialIntelligence;
