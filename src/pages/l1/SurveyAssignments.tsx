import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { fetchSurveys } from '@/lib/surveys';

interface FormOption {
  id: string;
  name: string;
}

interface AC {
  id: number;
  number: number;
  name: string;
}

interface Assignment {
  id: string;
  formId: string;
  formName: string;
  acNumber: number;
  acName: string;
  dateAssigned: string;
}

const mockACs: AC[] = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  number: 100 + i,
  name: i === 18 ? 'Thondamuthur' : `AC ${100 + i}`
}));

const initialAssignments: Assignment[] = [];

export const SurveyAssignments = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedAC, setSelectedAC] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [acFilter, setAcFilter] = useState<string>('all');
  const [forms, setForms] = useState<FormOption[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  useEffect(() => {
    const loadForms = async () => {
      setIsLoadingForms(true);
      try {
        const surveys = await fetchSurveys();
        setForms(
          surveys
            .filter((survey) => survey.status === 'Active')
            .map((survey) => ({
              id: survey.id,
              name: survey.title,
            })),
        );
      } catch (error) {
        console.error('Failed to load survey forms', error);
        toast({
          title: 'Unable to load forms',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingForms(false);
      }
    };

    loadForms();
  }, [toast]);

  // Filter assignments based on search term, form filter, and AC filter
  const activeFormIds = new Set(forms.map((form) => form.id));

  const filteredAssignments = assignments.filter(assignment => {
    if (!activeFormIds.has(assignment.formId)) {
      return false;
    }
    const matchesSearch = assignment.formName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         assignment.acName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.acNumber.toString().includes(searchTerm);
    
    const matchesForm = formFilter === 'all' || assignment.formId === formFilter;
    const matchesAC = acFilter === 'all' || assignment.acNumber === Number(acFilter);
    
    return matchesSearch && matchesForm && matchesAC;
  });

  const handleAssign = () => {
    if (!selectedForm || !selectedAC) {
      return;
    }

    const form = forms.find((f) => f.id === selectedForm);
    const ac = mockACs.find((a) => a.id.toString() === selectedAC);

    if (!form || !ac) {
      toast({
        title: 'Selection Required',
        description: 'Please select a valid form and assembly constituency.',
        variant: 'destructive',
      });
      return;
    }

    const existingAssignment = assignments.find(
      (assignment) => assignment.formId === form.id && assignment.acNumber === ac.number,
    );

    if (existingAssignment) {
      toast({
        title: 'Assignment Already Exists',
        description: `"${form.name}" is already assigned to AC ${ac.number} - ${ac.name}`,
        variant: 'destructive',
      });
      return;
    }

    const newAssignment: Assignment = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      formId: form.id,
      formName: form.name,
      acNumber: ac.number,
      acName: ac.name,
      dateAssigned: new Date().toISOString().split('T')[0],
    };

    setAssignments((prev) => [...prev, newAssignment]);
    setSelectedForm('');
    setSelectedAC('');

    toast({
      title: 'Assignment Created',
      description: `"${form.name}" has been assigned to AC ${ac.number} - ${ac.name}`,
    });
  };

  const handleDeleteAssignment = (id: string, formName: string, acNumber: number, acName: string) => {
    setAssignments((prev) => prev.filter((assignment) => assignment.id !== id));
    toast({
      title: 'Assignment Removed',
      description: `"${formName}" assignment to AC ${acNumber} - ${acName} has been removed`
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Survey Form Assignments</h1>
          <p className="text-muted-foreground">Assign survey forms to Assembly Constituencies</p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formSelect">Select Survey Form</Label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger id="formSelect">
                  <SelectValue placeholder="Choose a form" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingForms ? (
                    <SelectItem value="loading" disabled>
                      Loading forms...
                    </SelectItem>
                  ) : forms.length > 0 ? (
                    forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No active forms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acSelect">Select Assembly Constituency</Label>
              <Select value={selectedAC} onValueChange={setSelectedAC}>
                <SelectTrigger id="acSelect">
                  <SelectValue placeholder="Choose an AC" />
                </SelectTrigger>
                <SelectContent>
                  {mockACs.map((ac) => (
                    <SelectItem key={ac.id} value={ac.id.toString()}>
                      {ac.number} - {ac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                className="w-full" 
                onClick={handleAssign}
                disabled={!selectedForm || !selectedAC || isLoadingForms || forms.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Assign Form
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold">Current Assignments</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={formFilter} onValueChange={setFormFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Form" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Forms</SelectItem>
                  {isLoadingForms ? (
                    <SelectItem value="loading" disabled>
                      Loading forms...
                    </SelectItem>
                  ) : forms.length > 0 ? (
                    forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No active forms available
                    </SelectItem>
                  )}
                  </SelectContent>
                </Select>
                <Select value={acFilter} onValueChange={setAcFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by AC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ACs</SelectItem>
                    {mockACs.map((ac) => (
                      <SelectItem key={ac.id} value={ac.number.toString()}>
                        {ac.number} - {ac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Survey Form Name</TableHead>
                  <TableHead>Assigned AC</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.formName}</TableCell>
                      <TableCell>{assignment.acNumber} - {assignment.acName}</TableCell>
                      <TableCell>{assignment.dateAssigned}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteAssignment(
                            assignment.id, 
                            assignment.formName, 
                            assignment.acNumber, 
                            assignment.acName
                          )}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No assignments found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};