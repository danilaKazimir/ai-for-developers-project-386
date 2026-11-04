import { createContext, useContext } from 'react';

export const OrganizerAccessContext = createContext({
  token: '',
  revision: 0,
  changeToken: (_token: string) => { void _token; },
});

export function useOrganizerAccess() {
  return useContext(OrganizerAccessContext);
}
