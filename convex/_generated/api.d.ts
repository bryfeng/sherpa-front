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
import type * as admin_metrics from "../admin/metrics.js";
import type * as admin_sessions from "../admin/sessions.js";
import type * as admin_users from "../admin/users.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as dca from "../dca.js";
import type * as executions from "../executions.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as news from "../news.js";
import type * as rateLimit from "../rateLimit.js";
import type * as scheduler from "../scheduler.js";
import type * as sessionKeys from "../sessionKeys.js";
import type * as strategies from "../strategies.js";
import type * as tokenCatalog from "../tokenCatalog.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as wallets from "../wallets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/auth": typeof admin_auth;
  "admin/metrics": typeof admin_metrics;
  "admin/sessions": typeof admin_sessions;
  "admin/users": typeof admin_users;
  auth: typeof auth;
  conversations: typeof conversations;
  crons: typeof crons;
  dca: typeof dca;
  executions: typeof executions;
  health: typeof health;
  http: typeof http;
  news: typeof news;
  rateLimit: typeof rateLimit;
  scheduler: typeof scheduler;
  sessionKeys: typeof sessionKeys;
  strategies: typeof strategies;
  tokenCatalog: typeof tokenCatalog;
  transactions: typeof transactions;
  users: typeof users;
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
