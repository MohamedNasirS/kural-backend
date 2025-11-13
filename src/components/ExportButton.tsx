import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any;
  filename: string;
  acNumber?: string;
}

export const ExportButton = ({ data, filename, acNumber }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      // Convert data to CSV format
      let csvContent = '';
      
      // Add header information
      csvContent += 'AC Performance Report\n';
      csvContent += `AC Number,${acNumber || 'N/A'}\n`;
      csvContent += `Report Generated,${new Date().toLocaleDateString()}\n\n`;
      
      // Key metrics
      csvContent += 'Key Metrics\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Voters,${data.voters || 'N/A'}\n`;
      csvContent += `Total Families,${data.families || 'N/A'}\n`;
      csvContent += `Surveys Completed,${data.surveys || 'N/A'}\n`;
      csvContent += `Total Booths,${data.booths || 'N/A'}\n`;
      csvContent += `Completion Rate,${data.completion ? `${data.completion}%` : 'N/A'}\n\n`;
      
      // Booth performance data
      if (data.boothPerformance) {
        csvContent += 'Booth Performance\n';
        csvContent += 'Booth ID,Total Voters,Surveyed,Completion %\n';
        data.boothPerformance.forEach((booth: any) => {
          csvContent += `${booth.booth},${booth.voters},${booth.surveyed},${booth.completion}%\n`;
        });
        csvContent += '\n';
      }
      
      // Survey questions data
      if (data.surveyQuestions) {
        csvContent += 'Survey Question Coverage\n';
        csvContent += 'Question,Responses,Percentage\n';
        data.surveyQuestions.forEach((q: any) => {
          csvContent += `"${q.question}",${q.responses},${q.percentage}%\n`;
        });
        csvContent += '\n';
      }
      
      // Agent performance data
      if (data.agentPerformance) {
        csvContent += 'Agent Performance\n';
        csvContent += 'Agent Name,Surveys Completed,Quality Score\n';
        data.agentPerformance.forEach((agent: any) => {
          csvContent += `"${agent.name}",${agent.surveys},${agent.quality}%\n`;
        });
        csvContent += '\n';
      }
      
      // Weekly trend data
      if (data.weeklyTrend) {
        csvContent += 'Weekly Survey Trend\n';
        csvContent += 'Week,Completed Surveys\n';
        data.weeklyTrend.forEach((week: any) => {
          csvContent += `"${week.week}",${week.completed}\n`;
        });
        csvContent += '\n';
      }
      
      // Response distribution data
      if (data.responseDistribution) {
        csvContent += 'Response Distribution\n';
        csvContent += 'Status,Count\n';
        data.responseDistribution.forEach((status: any) => {
          csvContent += `"${status.name}",${status.value}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'CSV file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the file.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      // For now, we'll export as CSV but with Excel extension
      // In a real app, you would use a library like xlsx
      let csvContent = '';
      
      // Add header information
      csvContent += 'AC Performance Report\n';
      csvContent += `AC Number\t${acNumber || 'N/A'}\n`;
      csvContent += `Report Generated\t${new Date().toLocaleDateString()}\n\n`;
      
      // Key metrics
      csvContent += 'Key Metrics\n';
      csvContent += 'Metric\tValue\n';
      csvContent += `Total Voters\t${data.voters || 'N/A'}\n`;
      csvContent += `Total Families\t${data.families || 'N/A'}\n`;
      csvContent += `Surveys Completed\t${data.surveys || 'N/A'}\n`;
      csvContent += `Total Booths\t${data.booths || 'N/A'}\n`;
      csvContent += `Completion Rate\t${data.completion ? `${data.completion}%` : 'N/A'}\n\n`;
      
      // Booth performance data
      if (data.boothPerformance) {
        csvContent += 'Booth Performance\n';
        csvContent += 'Booth ID\tTotal Voters\tSurveyed\tCompletion %\n';
        data.boothPerformance.forEach((booth: any) => {
          csvContent += `${booth.booth}\t${booth.voters}\t${booth.surveyed}\t${booth.completion}%\n`;
        });
        csvContent += '\n';
      }

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xls`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Excel file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the file.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      // Mock PDF export (in real app, use a library like jsPDF)
      toast({
        title: 'PDF Export',
        description: 'PDF export functionality would be implemented with jsPDF library in a production environment.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify({ ...data, acNumber, generatedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'JSON file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the file.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};