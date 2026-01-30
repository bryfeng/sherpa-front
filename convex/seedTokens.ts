/**
 * Token seeding script for swap functionality.
 *
 * Populates the tokenCatalog table with known tokens for swap support.
 * Can be run via Convex dashboard or CLI: npx convex run seedTokens:seedAllTokens
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Native token placeholder address
const NATIVE_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

// Token data type
interface SwapToken {
  address: string;
  chainId: number | "solana";
  symbol: string;
  name: string;
  decimals: number;
  aliases: string[];
  isNative: boolean;
  coingeckoId?: string;
}

// =============================================================================
// Token Registry Data
// =============================================================================

const ETHEREUM_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 1,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    aliases: ["eth", "ether", "ethereum", "native"],
    isNative: true,
    coingeckoId: "ethereum",
  },
  {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    chainId: 1,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth", "wrapped ether"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    chainId: 1,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc", "usd coin", "circle usd"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    chainId: 1,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    aliases: ["usdt", "tether"],
    isNative: false,
    coingeckoId: "tether",
  },
  {
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    chainId: 1,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    aliases: ["dai"],
    isNative: false,
    coingeckoId: "dai",
  },
  {
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    chainId: 1,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    aliases: ["wbtc", "wrapped btc", "wrapped bitcoin"],
    isNative: false,
    coingeckoId: "wrapped-bitcoin",
  },
  {
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    chainId: 1,
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18,
    aliases: ["link", "chainlink"],
    isNative: false,
    coingeckoId: "chainlink",
  },
  {
    address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    chainId: 1,
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18,
    aliases: ["uni", "uniswap"],
    isNative: false,
    coingeckoId: "uniswap",
  },
  {
    address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    chainId: 1,
    symbol: "AAVE",
    name: "Aave Token",
    decimals: 18,
    aliases: ["aave"],
    isNative: false,
    coingeckoId: "aave",
  },
];

const BASE_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 8453,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    aliases: ["eth", "ether", "native"],
    isNative: true,
    coingeckoId: "ethereum",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    chainId: 8453,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    chainId: 8453,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc", "usd coin"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca",
    chainId: 8453,
    symbol: "USDbC",
    name: "USD Base Coin (Bridged)",
    decimals: 6,
    aliases: ["usdbc", "bridged usdc"],
    isNative: false,
    coingeckoId: "bridged-usd-coin-base",
  },
  {
    address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    chainId: 8453,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    aliases: ["dai"],
    isNative: false,
    coingeckoId: "dai",
  },
  {
    address: "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22",
    chainId: 8453,
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18,
    aliases: ["cbeth", "coinbase eth"],
    isNative: false,
    coingeckoId: "coinbase-wrapped-staked-eth",
  },
];

const ARBITRUM_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 42161,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    aliases: ["eth", "ether", "native"],
    isNative: true,
    coingeckoId: "ethereum",
  },
  {
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    chainId: 42161,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    chainId: 42161,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc", "usd coin"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    chainId: 42161,
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    aliases: ["usdc.e", "bridged usdc", "usdce"],
    isNative: false,
    coingeckoId: "usd-coin-ethereum-bridged",
  },
  {
    address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    chainId: 42161,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    aliases: ["usdt", "tether"],
    isNative: false,
    coingeckoId: "tether",
  },
  {
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    chainId: 42161,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    aliases: ["dai"],
    isNative: false,
    coingeckoId: "dai",
  },
  {
    address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
    chainId: 42161,
    symbol: "ARB",
    name: "Arbitrum",
    decimals: 18,
    aliases: ["arb", "arbitrum"],
    isNative: false,
    coingeckoId: "arbitrum",
  },
  {
    address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    chainId: 42161,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    aliases: ["wbtc", "wrapped btc"],
    isNative: false,
    coingeckoId: "wrapped-bitcoin",
  },
  {
    address: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    chainId: 42161,
    symbol: "GMX",
    name: "GMX",
    decimals: 18,
    aliases: ["gmx"],
    isNative: false,
    coingeckoId: "gmx",
  },
];

const OPTIMISM_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 10,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    aliases: ["eth", "ether", "native"],
    isNative: true,
    coingeckoId: "ethereum",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    chainId: 10,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    chainId: 10,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc", "usd coin"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    chainId: 10,
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    aliases: ["usdc.e", "bridged usdc", "usdce"],
    isNative: false,
    coingeckoId: "usd-coin-ethereum-bridged",
  },
  {
    address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    chainId: 10,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    aliases: ["usdt", "tether"],
    isNative: false,
    coingeckoId: "tether",
  },
  {
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    chainId: 10,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    aliases: ["dai"],
    isNative: false,
    coingeckoId: "dai",
  },
  {
    address: "0x4200000000000000000000000000000000000042",
    chainId: 10,
    symbol: "OP",
    name: "Optimism",
    decimals: 18,
    aliases: ["op", "optimism"],
    isNative: false,
    coingeckoId: "optimism",
  },
];

const POLYGON_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 137,
    symbol: "MATIC",
    name: "Polygon",
    decimals: 18,
    aliases: ["matic", "polygon", "native"],
    isNative: true,
    coingeckoId: "matic-network",
  },
  {
    address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    chainId: 137,
    symbol: "WMATIC",
    name: "Wrapped Matic",
    decimals: 18,
    aliases: ["wmatic", "wrapped matic"],
    isNative: false,
    coingeckoId: "wmatic",
  },
  {
    address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    chainId: 137,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth", "eth"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    chainId: 137,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc", "usd coin"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    chainId: 137,
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    aliases: ["usdc.e", "bridged usdc", "usdce"],
    isNative: false,
    coingeckoId: "usd-coin-ethereum-bridged",
  },
  {
    address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    chainId: 137,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    aliases: ["usdt", "tether"],
    isNative: false,
    coingeckoId: "tether",
  },
  {
    address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    chainId: 137,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    aliases: ["dai"],
    isNative: false,
    coingeckoId: "dai",
  },
  {
    address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
    chainId: 137,
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    aliases: ["wbtc", "wrapped btc"],
    isNative: false,
    coingeckoId: "wrapped-bitcoin",
  },
  {
    address: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
    chainId: 137,
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18,
    aliases: ["link", "chainlink"],
    isNative: false,
    coingeckoId: "chainlink",
  },
  {
    address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
    chainId: 137,
    symbol: "AAVE",
    name: "Aave Token",
    decimals: 18,
    aliases: ["aave"],
    isNative: false,
    coingeckoId: "aave",
  },
];

const INK_TOKENS: SwapToken[] = [
  {
    address: NATIVE_PLACEHOLDER,
    chainId: 57073,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    aliases: ["eth", "ether", "native"],
    isNative: true,
    coingeckoId: "ethereum",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    chainId: 57073,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    aliases: ["weth", "wrapped eth"],
    isNative: false,
    coingeckoId: "weth",
  },
  {
    address: "0xf1815bd50389c46847f0bda824ec8da914045d14",
    chainId: 57073,
    symbol: "USDC.e",
    name: "Bridged USDC (Stargate)",
    decimals: 6,
    aliases: ["usdc.e", "usdc", "bridged usdc", "usdce"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
];

const SOLANA_TOKENS: SwapToken[] = [
  {
    address: NATIVE_SOL_MINT,
    chainId: "solana",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    aliases: ["sol", "solana", "native"],
    isNative: true,
    coingeckoId: "solana",
  },
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    chainId: "solana",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    aliases: ["usdc"],
    isNative: false,
    coingeckoId: "usd-coin",
  },
  {
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    chainId: "solana",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    aliases: ["usdt", "tether"],
    isNative: false,
    coingeckoId: "tether",
  },
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    chainId: "solana",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
    aliases: ["bonk"],
    isNative: false,
    coingeckoId: "bonk",
  },
  {
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    chainId: "solana",
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
    aliases: ["jup", "jupiter"],
    isNative: false,
    coingeckoId: "jupiter-exchange-solana",
  },
  {
    address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    chainId: "solana",
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
    aliases: ["ray", "raydium"],
    isNative: false,
    coingeckoId: "raydium",
  },
  {
    address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    chainId: "solana",
    symbol: "PYTH",
    name: "Pyth Network",
    decimals: 6,
    aliases: ["pyth"],
    isNative: false,
    coingeckoId: "pyth-network",
  },
  {
    address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    chainId: "solana",
    symbol: "JTO",
    name: "Jito",
    decimals: 9,
    aliases: ["jto", "jito"],
    isNative: false,
    coingeckoId: "jito-governance-token",
  },
  {
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    chainId: "solana",
    symbol: "WIF",
    name: "dogwifhat",
    decimals: 6,
    aliases: ["wif", "dogwifhat"],
    isNative: false,
    coingeckoId: "dogwifcoin",
  },
];

// =============================================================================
// Seed Functions
// =============================================================================

/**
 * Seed all tokens to tokenCatalog
 * Run via: npx convex run seedTokens:seedAllTokens
 */
export const seedAllTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const allTokens = [
      ...ETHEREUM_TOKENS,
      ...BASE_TOKENS,
      ...ARBITRUM_TOKENS,
      ...OPTIMISM_TOKENS,
      ...POLYGON_TOKENS,
      ...INK_TOKENS,
      ...SOLANA_TOKENS,
    ];

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const token of allTokens) {
      // Normalize address for EVM chains
      const address =
        typeof token.chainId === "number"
          ? token.address.toLowerCase()
          : token.address;

      // Check if exists
      const existing = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address", (q) =>
          q.eq("chainId", token.chainId).eq("address", address)
        )
        .first();

      const tokenData = {
        address,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        aliases: token.aliases,
        isNative: token.isNative,
        isEnabled: true,
        coingeckoId: token.coingeckoId,
        lastUpdated: now,
        // Defaults for full schema
        categories: [] as string[],
        isStablecoin:
          token.symbol === "USDC" ||
          token.symbol === "USDT" ||
          token.symbol === "DAI" ||
          token.symbol.includes("USD"),
        isWrapped: token.symbol.startsWith("W") && !token.isNative,
        isLpToken: false,
        isGovernanceToken:
          token.symbol === "UNI" ||
          token.symbol === "AAVE" ||
          token.symbol === "ARB" ||
          token.symbol === "OP",
        relatedTokens: [] as { address: string; chainId: number | "solana"; relationship: string }[],
        dataSource: "seed_script",
        enrichmentVersion: 1,
        tags: [] as string[],
      };

      if (existing) {
        // Update with new swap-related fields
        await ctx.db.patch(existing._id, {
          aliases: token.aliases,
          isEnabled: true,
          coingeckoId: token.coingeckoId,
          lastUpdated: now,
        });
        updated++;
      } else {
        await ctx.db.insert("tokenCatalog", tokenData);
        inserted++;
      }
    }

    return {
      success: true,
      inserted,
      updated,
      total: allTokens.length,
    };
  },
});

/**
 * Seed tokens for a specific chain
 */
export const seedChainTokens = mutation({
  args: {
    chainId: v.union(v.number(), v.literal("solana")),
  },
  handler: async (ctx, args) => {
    let tokens: SwapToken[];

    if (args.chainId === "solana") {
      tokens = SOLANA_TOKENS;
    } else {
      switch (args.chainId) {
        case 1:
          tokens = ETHEREUM_TOKENS;
          break;
        case 8453:
          tokens = BASE_TOKENS;
          break;
        case 42161:
          tokens = ARBITRUM_TOKENS;
          break;
        case 10:
          tokens = OPTIMISM_TOKENS;
          break;
        case 137:
          tokens = POLYGON_TOKENS;
          break;
        case 57073:
          tokens = INK_TOKENS;
          break;
        default:
          throw new Error(`Unknown chain: ${args.chainId}`);
      }
    }

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const token of tokens) {
      const address =
        typeof token.chainId === "number"
          ? token.address.toLowerCase()
          : token.address;

      const existing = await ctx.db
        .query("tokenCatalog")
        .withIndex("by_chain_address", (q) =>
          q.eq("chainId", token.chainId).eq("address", address)
        )
        .first();

      const tokenData = {
        address,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        aliases: token.aliases,
        isNative: token.isNative,
        isEnabled: true,
        coingeckoId: token.coingeckoId,
        lastUpdated: now,
        categories: [] as string[],
        isStablecoin:
          token.symbol === "USDC" ||
          token.symbol === "USDT" ||
          token.symbol === "DAI" ||
          token.symbol.includes("USD"),
        isWrapped: token.symbol.startsWith("W") && !token.isNative,
        isLpToken: false,
        isGovernanceToken: false,
        relatedTokens: [] as { address: string; chainId: number | "solana"; relationship: string }[],
        dataSource: "seed_script",
        enrichmentVersion: 1,
        tags: [] as string[],
      };

      if (existing) {
        await ctx.db.patch(existing._id, {
          aliases: token.aliases,
          isEnabled: true,
          coingeckoId: token.coingeckoId,
          lastUpdated: now,
        });
        updated++;
      } else {
        await ctx.db.insert("tokenCatalog", tokenData);
        inserted++;
      }
    }

    return {
      success: true,
      chainId: args.chainId,
      inserted,
      updated,
      total: tokens.length,
    };
  },
});

/**
 * Clear all swap tokens (for testing)
 */
export const clearAllTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("tokenCatalog").collect();
    let deleted = 0;

    for (const token of tokens) {
      await ctx.db.delete(token._id);
      deleted++;
    }

    return { success: true, deleted };
  },
});
// Force re-deploy 1769741967
