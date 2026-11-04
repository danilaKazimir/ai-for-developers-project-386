import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { OrganizerAccessContext } from './organizer-access';

export function OrganizerAccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState({ token: '', revision: 0 });
  const queryClient = useQueryClient();
  function changeToken(token: string) {
    // Cancel first: a late response must never repopulate a previous key's cache.
    const filters = { queryKey: ['/api/organizer/bookings'] };
    void queryClient.cancelQueries(filters);
    queryClient.removeQueries(filters);
    queryClient.getMutationCache().clear();
    setAccess((previous) => ({ token, revision: previous.revision + 1 }));
  }
  return <OrganizerAccessContext.Provider value={{ ...access, changeToken }}>{children}</OrganizerAccessContext.Provider>;
}
