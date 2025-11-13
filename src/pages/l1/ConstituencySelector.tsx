import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CONSTITUENCIES, type Constituency } from '@/constants/constituencies';

/**
 * ConstituencySelector Component
 * 
 * Displays a searchable grid of all Assembly Constituencies (AC).
 * Users can:
 * - Search by constituency name or number
 * - Click on any constituency card to view detailed information
 * 
 * @returns A dashboard layout with searchable constituency cards
 */
export const ConstituencySelector = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  /**
   * Filters constituencies based on search term
   * Matches against both constituency name (case-insensitive) and number
   */
  const filteredConstituencies = filterConstituencies(CONSTITUENCIES, searchTerm);

  /**
   * Handles constituency card click
   * Navigates to the detailed view for the selected constituency
   */
  const handleConstituencyClick = (acNumber: number) => {
    navigate(`/l1/ac/${acNumber}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-12 p-8">
        {/* Page Header */}
        <PageHeader />

        {/* Search Input */}
        <SearchBar value={searchTerm} onChange={setSearchTerm} />

        {/* Constituency Grid */}
        <ConstituencyGrid 
          constituencies={filteredConstituencies}
          onSelect={handleConstituencyClick}
        />
      </div>
    </DashboardLayout>
  );
};

/**
 * Page header with title and description
 */
const PageHeader = () => (
  <div className="space-y-4">
    <h1 className="text-6xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
      Assembly Constituencies
    </h1>
    <p className="text-xl text-muted-foreground font-medium">
      Select a constituency to view detailed information and analytics
    </p>
  </div>
);

/**
 * Search bar component for filtering constituencies
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
  <div className="relative max-w-2xl">
    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
      placeholder="Search by constituency name or number..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-14 h-14 text-base shadow-lg border-2 focus:border-primary focus:shadow-xl transition-all rounded-2xl"
    />
  </div>
);

/**
 * Grid of constituency cards
 */
interface ConstituencyGridProps {
  constituencies: Constituency[];
  onSelect: (acNumber: number) => void;
}

const ConstituencyGrid = ({ constituencies, onSelect }: ConstituencyGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {constituencies.map((ac) => (
      <ConstituencyCard 
        key={ac.number}
        constituency={ac}
        onClick={() => onSelect(ac.number)}
      />
    ))}
  </div>
);

/**
 * Individual constituency card with hover effects
 */
interface ConstituencyCardProps {
  constituency: Constituency;
  onClick: () => void;
}

const ConstituencyCard = ({ constituency, onClick }: ConstituencyCardProps) => (
  <Card
    className="p-5 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:border-primary/50 group bg-card"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      {/* Icon */}
      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 flex-shrink-0">
        <MapPin className="h-5 w-5" />
      </div>
      
      {/* Constituency info */}
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-primary mb-1">
          AC {constituency.number}
        </p>
        <p className="text-sm font-semibold text-foreground/80 group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {constituency.name}
        </p>
      </div>
    </div>
  </Card>
);

/**
 * Utility function to filter constituencies by search term
 * Searches both name (case-insensitive) and number
 */
const filterConstituencies = (
  constituencies: Constituency[],
  searchTerm: string
): Constituency[] => {
  if (!searchTerm.trim()) {
    return constituencies;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return constituencies.filter((ac) => 
    ac.name.toLowerCase().includes(lowerSearchTerm) ||
    ac.number.toString().includes(searchTerm)
  );
};
