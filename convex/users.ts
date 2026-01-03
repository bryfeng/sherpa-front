import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new user with optional wallet addresses
 */
export const create = mutation({
  args: {
    evmWalletAddress: v.optional(v.string()),
    solanaWalletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      evmWalletAddress: args.evmWalletAddress?.toLowerCase(),
      solanaWalletAddress: args.solanaWalletAddress,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get a user by ID
 */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get a user by EVM wallet address
 */
export const getByEvmWallet = query({
  args: { evmWalletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_evm_wallet", (q) =>
        q.eq("evmWalletAddress", args.evmWalletAddress.toLowerCase())
      )
      .first();
  },
});

/**
 * Get a user by Solana wallet address
 */
export const getBySolanaWallet = query({
  args: { solanaWalletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_solana_wallet", (q) =>
        q.eq("solanaWalletAddress", args.solanaWalletAddress)
      )
      .first();
  },
});

/**
 * Get or create user by wallet address
 * This is the main entry point for user creation
 */
export const getOrCreateByWallet = mutation({
  args: {
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    const isEvm = args.chain !== "solana";
    const normalizedAddress = isEvm
      ? args.address.toLowerCase()
      : args.address;

    // First, check if user exists by wallet address field
    let existingUser = null;
    if (isEvm) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_evm_wallet", (q) =>
          q.eq("evmWalletAddress", normalizedAddress)
        )
        .first();
    } else {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_solana_wallet", (q) =>
          q.eq("solanaWalletAddress", normalizedAddress)
        )
        .first();
    }

    // Check if wallet exists in wallets table
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", normalizedAddress).eq("chain", args.chain)
      )
      .first();

    if (existingUser && existingWallet) {
      return { user: existingUser, wallet: existingWallet, isNew: false };
    }

    if (existingUser && !existingWallet) {
      // User exists but wallet doesn't - create wallet
      const now = Date.now();
      const walletId = await ctx.db.insert("wallets", {
        userId: existingUser._id,
        address: normalizedAddress,
        chain: args.chain,
        isPrimary: true,
        createdAt: now,
      });
      const wallet = await ctx.db.get(walletId);
      return { user: existingUser, wallet, isNew: false };
    }

    if (!existingUser && existingWallet) {
      // Wallet exists but user doesn't have wallet field set - update user
      const user = await ctx.db.get(existingWallet.userId);
      if (user) {
        const updateData = isEvm
          ? { evmWalletAddress: normalizedAddress, updatedAt: Date.now() }
          : { solanaWalletAddress: normalizedAddress, updatedAt: Date.now() };
        await ctx.db.patch(existingWallet.userId, updateData);
        const updatedUser = await ctx.db.get(existingWallet.userId);
        return { user: updatedUser, wallet: existingWallet, isNew: false };
      }
    }

    // Create new user and wallet
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      evmWalletAddress: isEvm ? normalizedAddress : undefined,
      solanaWalletAddress: !isEvm ? normalizedAddress : undefined,
      createdAt: now,
      updatedAt: now,
    });

    const walletId = await ctx.db.insert("wallets", {
      userId,
      address: normalizedAddress,
      chain: args.chain,
      isPrimary: true,
      createdAt: now,
    });

    const user = await ctx.db.get(userId);
    const wallet = await ctx.db.get(walletId);

    return { user, wallet, isNew: true };
  },
});

/**
 * Update user's wallet addresses
 */
export const updateWalletAddresses = mutation({
  args: {
    userId: v.id("users"),
    evmWalletAddress: v.optional(v.string()),
    solanaWalletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: {
      evmWalletAddress?: string;
      solanaWalletAddress?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.evmWalletAddress !== undefined) {
      updates.evmWalletAddress = args.evmWalletAddress.toLowerCase();
    }
    if (args.solanaWalletAddress !== undefined) {
      updates.solanaWalletAddress = args.solanaWalletAddress;
    }

    await ctx.db.patch(args.userId, updates);
    return await ctx.db.get(args.userId);
  },
});

/**
 * Link a wallet address to an existing user
 */
export const linkWalletAddress = mutation({
  args: {
    userId: v.id("users"),
    address: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isEvm = args.chain !== "solana";
    const normalizedAddress = isEvm
      ? args.address.toLowerCase()
      : args.address;

    // Check if this wallet is already linked to another user
    if (isEvm) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_evm_wallet", (q) =>
          q.eq("evmWalletAddress", normalizedAddress)
        )
        .first();
      if (existingUser && existingUser._id !== args.userId) {
        throw new Error("This EVM wallet is already linked to another user");
      }
    } else {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_solana_wallet", (q) =>
          q.eq("solanaWalletAddress", normalizedAddress)
        )
        .first();
      if (existingUser && existingUser._id !== args.userId) {
        throw new Error("This Solana wallet is already linked to another user");
      }
    }

    // Update user with wallet address
    const updates = isEvm
      ? { evmWalletAddress: normalizedAddress, updatedAt: Date.now() }
      : { solanaWalletAddress: normalizedAddress, updatedAt: Date.now() };

    await ctx.db.patch(args.userId, updates);

    // Also ensure wallet exists in wallets table
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_address_chain", (q) =>
        q.eq("address", normalizedAddress).eq("chain", args.chain)
      )
      .first();

    if (!existingWallet) {
      await ctx.db.insert("wallets", {
        userId: args.userId,
        address: normalizedAddress,
        chain: args.chain,
        isPrimary: false,
        createdAt: Date.now(),
      });
    }

    return await ctx.db.get(args.userId);
  },
});
