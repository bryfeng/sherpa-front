/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_auth from "../admin/auth.js";
import type * as admin_authActions from "../admin/authActions.js";
import type * as admin_metrics from "../admin/metrics.js";
import type * as admin_sessions from "../admin/sessions.js";
import type * as admin_users from "../admin/users.js";
import type * as auth from "../auth.js";
import type * as chains from "../chains.js";
import type * as conversations from "../conversations.js";
import type * as copyTrading from "../copyTrading.js";
import type * as crons from "../crons.js";
import type * as dca from "../dca.js";
import type * as executions from "../executions.js";
import type * as feeConfig from "../feeConfig.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as news from "../news.js";
import type * as rateLimit from "../rateLimit.js";
import type * as riskPolicies from "../riskPolicies.js";
import type * as scheduler from "../scheduler.js";
import type * as sessionKeys from "../sessionKeys.js";
import type * as sessionWallets from "../sessionWallets.js";
import type * as smartAccounts from "../smartAccounts.js";
import type * as smartSessions from "../smartSessions.js";
import type * as strategies from "../strategies.js";
import type * as strategyExecutions from "../strategyExecutions.js";
import type * as subscriptions from "../subscriptions.js";
import type * as swigSessions from "../swigSessions.js";
import type * as swigWallets from "../swigWallets.js";
import type * as systemPolicy from "../systemPolicy.js";
import type * as tokenCatalog from "../tokenCatalog.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as walletActivity from "../walletActivity.js";
import type * as wallets from "../wallets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/auth": typeof admin_auth;
  "admin/authActions": typeof admin_authActions;
  "admin/metrics": typeof admin_metrics;
  "admin/sessions": typeof admin_sessions;
  "admin/users": typeof admin_users;
  auth: typeof auth;
  chains: typeof chains;
  conversations: typeof conversations;
  copyTrading: typeof copyTrading;
  crons: typeof crons;
  dca: typeof dca;
  executions: typeof executions;
  feeConfig: typeof feeConfig;
  health: typeof health;
  http: typeof http;
  "lib/authHelpers": typeof lib_authHelpers;
  news: typeof news;
  rateLimit: typeof rateLimit;
  riskPolicies: typeof riskPolicies;
  scheduler: typeof scheduler;
  sessionKeys: typeof sessionKeys;
  sessionWallets: typeof sessionWallets;
  smartAccounts: typeof smartAccounts;
  smartSessions: typeof smartSessions;
  strategies: typeof strategies;
  strategyExecutions: typeof strategyExecutions;
  subscriptions: typeof subscriptions;
  swigSessions: typeof swigSessions;
  swigWallets: typeof swigWallets;
  systemPolicy: typeof systemPolicy;
  tokenCatalog: typeof tokenCatalog;
  transactions: typeof transactions;
  users: typeof users;
  walletActivity: typeof walletActivity;
  wallets: typeof wallets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
