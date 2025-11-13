import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Home, FileCheck, MapPin, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Mock data for all ACs (101-126)
const allACsData = [
  { acNumber: '101', name: 'Dharapuram (SC)', voters: 2134, families: 589, surveys: 389, booths: 106, completion: 82, agentCount: 16 },
  { acNumber: '102', name: 'Kangayam', voters: 1845, families: 489, surveys: 256, booths: 87, completion: 66, agentCount: 14 },
  { acNumber: '108', name: 'Udhagamandalam', voters: 1678, families: 434, surveys: 223, booths: 79, completion: 67, agentCount: 13 },
  { acNumber: '109', name: 'Gudalur (SC)', voters: 1234, families: 298, surveys: 134, booths: 65, completion: 58, agentCount: 10 },
  { acNumber: '110', name: 'Coonoor', voters: 1890, families: 501, surveys: 278, booths: 91, completion: 71, agentCount: 14 },
  { acNumber: '111', name: 'Mettupalayam', voters: 2023, families: 556, surveys: 334, booths: 101, completion: 77, agentCount: 15 },
  { acNumber: '112', name: 'Avanashi (SC)', voters: 1756, families: 467, surveys: 245, booths: 84, completion: 69, agentCount: 13 },
  { acNumber: '113', name: 'Tiruppur North', voters: 2456, families: 689, surveys: 478, booths: 123, completion: 92, agentCount: 19 },
  { acNumber: '114', name: 'Tiruppur South', voters: 2189, families: 601, surveys: 401, booths: 109, completion: 84, agentCount: 17 },
  { acNumber: '115', name: 'Palladam', voters: 1823, families: 478, surveys: 267, booths: 88, completion: 70, agentCount: 14 },
  { acNumber: '116', name: 'Sulur', voters: 1678, families: 445, surveys: 234, booths: 82, completion: 65, agentCount: 12 },
  { acNumber: '117', name: 'Kavundampalayam', voters: 1956, families: 521, surveys: 312, booths: 97, completion: 73, agentCount: 15 },
  { acNumber: '118', name: 'Coimbatore North', voters: 2340, families: 678, surveys: 423, booths: 112, completion: 85, agentCount: 18 },
  { acNumber: '119', name: 'Thondamuthur', voters: 1247, families: 342, surveys: 156, booths: 89, completion: 78, agentCount: 12 },
  { acNumber: '120', name: 'Coimbatore South', voters: 1890, families: 534, surveys: 289, booths: 95, completion: 72, agentCount: 15 },
  { acNumber: '121', name: 'Singanallur', voters: 2145, families: 598, surveys: 387, booths: 108, completion: 91, agentCount: 17 },
  { acNumber: '122', name: 'Kinathukadavu', voters: 1678, families: 434, surveys: 223, booths: 79, completion: 67, agentCount: 13 },
  { acNumber: '123', name: 'Pollachi', voters: 2378, families: 645, surveys: 456, booths: 118, completion: 89, agentCount: 18 },
  { acNumber: '124', name: 'Valparai (SC)', voters: 1234, families: 298, surveys: 134, booths: 65, completion: 58, agentCount: 10 },
  { acNumber: '125', name: 'Udumalaipettai', voters: 1945, families: 534, surveys: 298, booths: 93, completion: 75, agentCount: 15 },
  { acNumber: '126', name: 'Madathukulam', voters: 1567, families: 412, surveys: 189, booths: 71, completion: 62, agentCount: 11 },
];

export const ACComparison = () => {
  const [selectedACs, setSelectedACs] = useState<string[]>(['101', '102']);

  const handleACSelection = (index: number, value: string) => {
    const newSelection = [...selectedACs];
    newSelection[index] = value;
    setSelectedACs(newSelection);
  };

  const addComparison = () => {
    if (selectedACs.length < 4) {
      setSelectedACs([...selectedACs, '108']);
    }
  };

  const removeComparison = (index: number) => {
    if (selectedACs.length > 2) {
      setSelectedACs(selectedACs.filter((_, i) => i !== index));
    }
  };

  const comparisonData = selectedACs.map((acNum) => {
    const ac = allACsData.find((a) => a.acNumber === acNum) || allACsData[0];
    return ac;
  });

  // Prepare chart data
  const barChartData = [
    {
      metric: 'Voters',
      ...comparisonData.reduce((acc, ac) => ({ ...acc, [ac.name]: ac.voters }), {}),
    },
    {
      metric: 'Families',
      ...comparisonData.reduce((acc, ac) => ({ ...acc, [ac.name]: ac.families }), {}),
    },
    {
      metric: 'Surveys',
      ...comparisonData.reduce((acc, ac) => ({ ...acc, [ac.name]: ac.surveys }), {}),
    },
    {
      metric: 'Booths',
      ...comparisonData.reduce((acc, ac) => ({ ...acc, [ac.name]: ac.booths }), {}),
    },
  ];

  const radarChartData = comparisonData.map((ac) => ({
    ac: `AC ${ac.acNumber}`,
    Voters: (ac.voters / 2500) * 100,
    Families: (ac.families / 700) * 100,
    Surveys: (ac.surveys / 500) * 100,
    Completion: ac.completion,
    Agents: (ac.agentCount / 20) * 100,
  }));

  const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  const handleExport = () => {
    // Mock export functionality
    const csvContent = [
      ['AC Number', 'Name', 'Voters', 'Families', 'Surveys', 'Booths', 'Completion %'],
      ...comparisonData.map((ac) => [
        ac.acNumber,
        ac.name,
        ac.voters,
        ac.families,
        ac.surveys,
        ac.booths,
        ac.completion,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ac-comparison.csv';
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">AC Comparison Dashboard</h1>
            <p className="text-xl text-muted-foreground">Compare up to 4 Assembly Constituencies side-by-side</p>
          </div>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Comparison
          </Button>
        </div>

        {/* AC Selectors */}
        <Card className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            {selectedACs.map((acNum, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select value={acNum} onValueChange={(value) => handleACSelection(index, value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allACsData.map((ac) => (
                      <SelectItem key={ac.acNumber} value={ac.acNumber}>
                        AC {ac.acNumber} - {ac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedACs.length > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeComparison(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {selectedACs.length < 4 && (
              <Button variant="outline" onClick={addComparison}>
                + Add AC
              </Button>
            )}
          </div>
        </Card>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {comparisonData.map((ac, index) => (
            <Card key={ac.acNumber} className="p-6 border-2" style={{ borderColor: colors[index] }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">AC {ac.acNumber}</h3>
                  <p className="text-sm text-muted-foreground">{ac.name}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Completion</span>
                    <Badge variant={ac.completion >= 80 ? 'default' : ac.completion >= 60 ? 'secondary' : 'destructive'}>
                      {ac.completion}%
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${ac.completion}%`, backgroundColor: colors[index] }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: colors[index] }} />
                      <span className="text-sm">Voters</span>
                    </div>
                    <span className="font-bold">{ac.voters.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" style={{ color: colors[index] }} />
                      <span className="text-sm">Families</span>
                    </div>
                    <span className="font-bold">{ac.families}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4" style={{ color: colors[index] }} />
                      <span className="text-sm">Surveys</span>
                    </div>
                    <span className="font-bold">{ac.surveys}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: colors[index] }} />
                      <span className="text-sm">Booths</span>
                    </div>
                    <span className="font-bold">{ac.booths}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bar Chart Comparison */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Comparative Metrics</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              {comparisonData.map((ac, index) => (
                <Bar key={ac.acNumber} dataKey={ac.name} fill={colors[index]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar Chart Multi-Metric Comparison */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Multi-Metric Performance Radar</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarChartData[0] ? [radarChartData[0]] : []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="ac" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {Object.keys(radarChartData[0] || {})
                .filter((key) => key !== 'ac')
                .map((key, index) => (
                  <Radar
                    key={key}
                    name={key}
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.3}
                  />
                ))}
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Difference Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Comparative Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  {comparisonData.map((ac) => (
                    <th key={ac.acNumber} className="text-right p-2">
                      AC {ac.acNumber}
                    </th>
                  ))}
                  <th className="text-right p-2">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Voters</td>
                  {comparisonData.map((ac) => (
                    <td key={ac.acNumber} className="text-right p-2">
                      {ac.voters.toLocaleString()}
                    </td>
                  ))}
                  <td className="text-right p-2 text-muted-foreground">
                    {Math.max(...comparisonData.map((a) => a.voters)) -
                      Math.min(...comparisonData.map((a) => a.voters))}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Families</td>
                  {comparisonData.map((ac) => (
                    <td key={ac.acNumber} className="text-right p-2">
                      {ac.families}
                    </td>
                  ))}
                  <td className="text-right p-2 text-muted-foreground">
                    {Math.max(...comparisonData.map((a) => a.families)) -
                      Math.min(...comparisonData.map((a) => a.families))}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Surveys</td>
                  {comparisonData.map((ac) => (
                    <td key={ac.acNumber} className="text-right p-2">
                      {ac.surveys}
                    </td>
                  ))}
                  <td className="text-right p-2 text-muted-foreground">
                    {Math.max(...comparisonData.map((a) => a.surveys)) -
                      Math.min(...comparisonData.map((a) => a.surveys))}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Completion %</td>
                  {comparisonData.map((ac) => (
                    <td key={ac.acNumber} className="text-right p-2">
                      {ac.completion}%
                    </td>
                  ))}
                  <td className="text-right p-2 text-muted-foreground">
                    {Math.max(...comparisonData.map((a) => a.completion)) -
                      Math.min(...comparisonData.map((a) => a.completion))}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
