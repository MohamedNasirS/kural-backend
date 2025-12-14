/**
 * MLA Layout - Wrapper for MLA Dashboard pages
 *
 * See docs/MLA_DASHBOARD_CONTENT.md for UI specification
 */

import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CONSTITUENCIES } from '@/constants/constituencies';

export default function MLALayout() {
  const { user } = useAuth();

  // Get AC name from constituencies constant
  const acName = CONSTITUENCIES.find((c) => c.number === user?.assignedAC)?.name || '';

  return (
    <DashboardLayout>
      <div className="p-4">
        {/* Header with AC info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">MLA War Room Dashboard</h1>
          <p className="text-gray-600">
            AC {user?.assignedAC} - {acName}
          </p>
        </div>

        {/* Child routes render here */}
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
