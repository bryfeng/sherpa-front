import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
  handler: async (ctx, args) => {
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
  },
});
