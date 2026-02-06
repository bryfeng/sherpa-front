/**
 * Hook for managing user preferences stored in Convex.
 * Provides reactive access to preferences with automatic updates.
 */

import { useQuery, useMutation } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "../../convex/_generated/api";

// Default chains when user has no preferences set
const DEFAULT_ENABLED_CHAINS = ["ethereum"];

export interface UserPreferences {
  walletAddress: string;
  enabledPortfolioChains: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UseUserPreferencesResult {
  /** Current preferences (null if loading or no wallet) */
  preferences: UserPreferences | null;
  /** Whether preferences are loading */
  isLoading: boolean;
  /** Enabled portfolio chains (with fallback to defaults) */
  enabledChains: string[];
  /** Toggle a single chain on/off */
  toggleChain: (chain: string, enabled: boolean) => Promise<void>;
  /** Set all enabled chains at once */
  setEnabledChains: (chains: string[]) => Promise<void>;
  /** Check if a specific chain is enabled */
  isChainEnabled: (chain: string) => boolean;
}

/**
 * Hook for accessing and updating user preferences.
 *
 * @param walletAddress - The user's wallet address (null if not connected)
 * @returns User preferences and mutation functions
 */
export function useUserPreferences(
  walletAddress: string | null
): UseUserPreferencesResult {
  // Query preferences from Convex (reactive)
  const preferences = useQuery(
    api.userPreferences.get,
    walletAddress ? { walletAddress } : "skip"
  );

  // Mutations
  const toggleChainMutation = useMutation(api.userPreferences.toggleChain);
  const setEnabledChainsMutation = useMutation(api.userPreferences.setEnabledChains);

  // Derived state
  const isLoading = walletAddress !== null && preferences === undefined;

  const enabledChains = useMemo(() => {
    if (!preferences) return DEFAULT_ENABLED_CHAINS;
    return preferences.enabledPortfolioChains;
  }, [preferences]);

  // Handlers
  const toggleChain = useCallback(
    async (chain: string, enabled: boolean) => {
      if (!walletAddress) return;
      await toggleChainMutation({ walletAddress, chain, enabled });
    },
    [walletAddress, toggleChainMutation]
  );

  const setEnabledChains = useCallback(
    async (chains: string[]) => {
      if (!walletAddress) return;
      if (chains.length === 0) {
        throw new Error("At least one chain must be enabled");
      }
      await setEnabledChainsMutation({ walletAddress, chains });
    },
    [walletAddress, setEnabledChainsMutation]
  );

  const isChainEnabled = useCallback(
    (chain: string) => {
      return enabledChains.includes(chain);
    },
    [enabledChains]
  );

  return {
    preferences: preferences ?? null,
    isLoading,
    enabledChains,
    toggleChain,
    setEnabledChains,
    isChainEnabled,
  };
}
