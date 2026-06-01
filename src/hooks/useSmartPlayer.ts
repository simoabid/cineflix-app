import { useContext } from 'react';
import { SmartPlayerContext, type SmartPlayerContextValue } from '@/contexts/SmartPlayerContext';

/**
 * Custom hook to consume the SmartPlayerContext.
 * Throws an error if used outside a SmartPlayerProvider.
 */
export function useSmartPlayer(): SmartPlayerContextValue {
  const context = useContext(SmartPlayerContext);
  if (context === undefined) {
    throw new Error('useSmartPlayer must be used within a SmartPlayerProvider');
  }
  return context;
}
