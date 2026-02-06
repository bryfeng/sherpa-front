/**
 * Chain seeding script
 *
 * Populates the chains table with supported chains.
 * Run via: npx convex run seedChains:seedAllChains
 */

import { mutation } from "./_generated/server";

interface ChainConfig {
  chainId: number;
  name: string;
  aliases: string[];
  alchemySlug?: string;
  alchemyVerified?: boolean;
  nativeSymbol: string;
  nativeDecimals: number;
  isTestnet: boolean;
  isEnabled: boolean;
  explorerUrl?: string;
}

// =============================================================================
// Chain Registry Data
// =============================================================================

const CHAINS: ChainConfig[] = [
  // Mainnets
  {
    chainId: 1,
    name: "Ethereum",
    aliases: ["eth", "mainnet", "ethereum"],
    alchemySlug: "eth-mainnet",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://etherscan.io",
  },
  {
    chainId: 8453,
    name: "Base",
    aliases: ["base"],
    alchemySlug: "base-mainnet",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://basescan.org",
  },
  {
    chainId: 42161,
    name: "Arbitrum",
    aliases: ["arb", "arbitrum", "arbitrum-one"],
    alchemySlug: "arb-mainnet",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://arbiscan.io",
  },
  {
    chainId: 10,
    name: "Optimism",
    aliases: ["op", "optimism"],
    alchemySlug: "opt-mainnet",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://optimistic.etherscan.io",
  },
  {
    chainId: 137,
    name: "Polygon",
    aliases: ["matic", "polygon"],
    alchemySlug: "polygon-mainnet",
    alchemyVerified: true,
    nativeSymbol: "MATIC",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://polygonscan.com",
  },
  {
    chainId: 57073,
    name: "Ink",
    aliases: ["ink"],
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    isEnabled: true,
    explorerUrl: "https://explorer.inkonchain.com",
  },

  // Testnets
  {
    chainId: 84532,
    name: "Base Sepolia",
    aliases: ["base-sepolia", "basesepolia"],
    alchemySlug: "base-sepolia",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    isEnabled: true,
    explorerUrl: "https://sepolia.basescan.org",
  },
  {
    chainId: 11155111,
    name: "Sepolia",
    aliases: ["sepolia", "eth-sepolia"],
    alchemySlug: "eth-sepolia",
    alchemyVerified: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    isEnabled: true,
    explorerUrl: "https://sepolia.etherscan.io",
  },
];

// =============================================================================
// Seed Functions
// =============================================================================

/**
 * Seed all chains to the database.
 * This will upsert chains (update if exists, insert if not).
 */
export const seedAllChains = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const chain of CHAINS) {
      const existing = await ctx.db
        .query("chains")
        .withIndex("by_chain_id", (q) => q.eq("chainId", chain.chainId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...chain,
          updatedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("chains", {
          ...chain,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }

    return {
      success: true,
      inserted,
      updated,
      total: CHAINS.length,
    };
  },
});

/**
 * Seed only Base Sepolia (quick add for testing).
 */
export const seedBaseSepolia = mutation({
  args: {},
  handler: async (ctx) => {
    const baseSepolia: ChainConfig = {
      chainId: 84532,
      name: "Base Sepolia",
      aliases: ["base-sepolia", "basesepolia"],
      alchemySlug: "base-sepolia",
      alchemyVerified: true,
      nativeSymbol: "ETH",
      nativeDecimals: 18,
      isTestnet: true,
      isEnabled: true,
      explorerUrl: "https://sepolia.basescan.org",
    };

    const now = Date.now();
    const existing = await ctx.db
      .query("chains")
      .withIndex("by_chain_id", (q) => q.eq("chainId", 84532))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...baseSepolia,
        updatedAt: now,
      });
      return { success: true, action: "updated", chainId: 84532 };
    } else {
      await ctx.db.insert("chains", {
        ...baseSepolia,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, action: "inserted", chainId: 84532 };
    }
  },
});
