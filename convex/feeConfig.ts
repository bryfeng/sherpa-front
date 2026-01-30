import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";

const feeAssetOrderValidator = v.array(
  v.union(v.literal("stablecoin"), v.literal("native"))
);

type ChainId = number | string;

const normalizeAddressForChain = (
  chainId: ChainId,
  address?: string
): string | undefined => {
  if (!address) return address;
  return typeof chainId === "number" ? address.toLowerCase() : address;
};

const validateFeeAssetOrder = (
  allowNativeFallback: boolean,
  feeAssetOrder: Array<"stablecoin" | "native">
) => {
  if (feeAssetOrder.length === 0) {
    throw new Error("Fee asset order cannot be empty");
  }

  const uniqueOrder = new Set(feeAssetOrder);
  if (uniqueOrder.size !== feeAssetOrder.length) {
    throw new Error("Fee asset order cannot contain duplicates");
  }

  if (!feeAssetOrder.includes("stablecoin")) {
    throw new Error("Fee asset order must include stablecoin");
  }

  if (allowNativeFallback && !feeAssetOrder.includes("native")) {
    throw new Error(
      "Native fallback enabled but fee asset order does not include native"
    );
  }

  if (!allowNativeFallback && feeAssetOrder.includes("native")) {
    throw new Error(
      "Native fallback disabled but fee asset order includes native"
    );
  }
};

const DEFAULT_FEE_CONFIGS: Array<{
  chainId: ChainId;
  stablecoinSymbol: string;
  stablecoinAddress: string;
  stablecoinDecimals: number;
  allowNativeFallback: boolean;
  nativeSymbol: string;
  nativeDecimals: number;
  feeAssetOrder: Array<"stablecoin" | "native">;
  reimbursementMode: "per_tx" | "batch" | "none";
  isEnabled: boolean;
}> = [
  {
    chainId: 1,
    stablecoinSymbol: "USDC",
    stablecoinAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "none",
    isEnabled: true,
  },
  {
    chainId: 10,
    stablecoinSymbol: "USDC",
    stablecoinAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "none",
    isEnabled: true,
  },
  {
    chainId: 42161,
    stablecoinSymbol: "USDC",
    stablecoinAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "none",
    isEnabled: true,
  },
  {
    chainId: 8453,
    stablecoinSymbol: "USDC",
    stablecoinAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "none",
    isEnabled: true,
  },
  {
    chainId: 137,
    stablecoinSymbol: "USDC",
    stablecoinAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "MATIC",
    nativeDecimals: 18,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "none",
    isEnabled: true,
  },
  {
    chainId: "solana",
    stablecoinSymbol: "USDC",
    stablecoinAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    stablecoinDecimals: 6,
    allowNativeFallback: true,
    nativeSymbol: "SOL",
    nativeDecimals: 9,
    feeAssetOrder: ["stablecoin", "native"],
    reimbursementMode: "per_tx",
    isEnabled: true,
  },
];

const upsertFeeConfig = async (
  ctx: MutationCtx,
  args: {
    chainId: ChainId;
    stablecoinSymbol: string;
    stablecoinAddress?: string;
    stablecoinDecimals: number;
    allowNativeFallback: boolean;
    nativeSymbol: string;
    nativeDecimals: number;
    feeAssetOrder: Array<"stablecoin" | "native">;
    reimbursementMode: "per_tx" | "batch" | "none";
    isEnabled: boolean;
    updatedBy?: string;
  }
) => {
  validateFeeAssetOrder(args.allowNativeFallback, args.feeAssetOrder);

  const normalizedStablecoinAddress = normalizeAddressForChain(
    args.chainId,
    args.stablecoinAddress
  );

  const now = Date.now();

  const existing = await ctx.db
    .query("feeConfigs")
    .withIndex("by_chain_id", (q) => q.eq("chainId", args.chainId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...args,
      stablecoinAddress: normalizedStablecoinAddress,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("feeConfigs", {
    ...args,
    stablecoinAddress: normalizedStablecoinAddress,
    createdAt: now,
    updatedAt: now,
  });
};

// =============================================================================
// Queries
// =============================================================================

export const getByChainId = query({
  args: {
    chainId: v.union(v.number(), v.string()),
  },
  handler: async (ctx, { chainId }) => {
    const config = await ctx.db
      .query("feeConfigs")
      .withIndex("by_chain_id", (q) => q.eq("chainId", chainId))
      .first();

    return config;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("feeConfigs").collect();
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const upsert = mutation({
  args: {
    chainId: v.union(v.number(), v.string()),
    stablecoinSymbol: v.string(),
    stablecoinAddress: v.optional(v.string()),
    stablecoinDecimals: v.number(),
    allowNativeFallback: v.boolean(),
    nativeSymbol: v.string(),
    nativeDecimals: v.number(),
    feeAssetOrder: feeAssetOrderValidator,
    reimbursementMode: v.union(
      v.literal("per_tx"),
      v.literal("batch"),
      v.literal("none")
    ),
    isEnabled: v.boolean(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => upsertFeeConfig(ctx, args),
});

export const seedDefaults = mutation({
  args: {
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, { updatedBy }) => {
    const ids: string[] = [];
    for (const config of DEFAULT_FEE_CONFIGS) {
      const id = await upsertFeeConfig(ctx, {
        ...config,
        updatedBy,
      });
      ids.push(id as string);
    }
    return ids;
  },
});
