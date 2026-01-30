import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * Health check endpoint
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Trigger strategy execution (called by FastAPI scheduler or external triggers)
 * POST /trigger-execution
 * Body: { strategyId: string }
 */
http.route({
  path: "/trigger-execution",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify internal API key
    const apiKey = request.headers.get("X-Internal-Key");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { strategyId, walletAddress } = body as { strategyId: string; walletAddress?: string };

      if (!strategyId) {
        return new Response(
          JSON.stringify({ error: "strategyId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Use provided wallet address or placeholder (strategy execution should provide this)
      const resolvedWalletAddress = walletAddress || "0x0000000000000000000000000000000000000000";

      // Create execution record
      const executionId = await ctx.runMutation(api.executions.create, {
        strategyId: strategyId as any,
        walletAddress: resolvedWalletAddress,
      });

      return new Response(
        JSON.stringify({ success: true, executionId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Update execution status (called by FastAPI after running agent)
 * POST /update-execution
 * Body: { executionId: string, status: "completed" | "failed", result?: any, error?: string }
 */
http.route({
  path: "/update-execution",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-Internal-Key");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { executionId, status, result, error } = body as {
        executionId: string;
        status: "completed" | "failed";
        result?: any;
        error?: string;
      };

      if (status === "completed") {
        await ctx.runMutation(api.executions.complete, {
          executionId: executionId as any,
          result,
        });
      } else if (status === "failed") {
        await ctx.runMutation(api.executions.fail, {
          executionId: executionId as any,
          error: error || "Unknown error",
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Record agent decision (called by FastAPI during agent execution)
 * POST /record-decision
 */
http.route({
  path: "/record-decision",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-Internal-Key");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const {
        executionId,
        decisionType,
        inputContext,
        reasoning,
        actionTaken,
        riskAssessment,
      } = body as {
        executionId: string;
        decisionType: string;
        inputContext: any;
        reasoning: string;
        actionTaken: any;
        riskAssessment: any;
      };

      const decisionId = await ctx.runMutation(api.executions.addDecision, {
        executionId: executionId as any,
        decisionType,
        inputContext,
        reasoning,
        actionTaken,
        riskAssessment,
      });

      return new Response(
        JSON.stringify({ success: true, decisionId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Record transaction (called by FastAPI when executing on-chain actions)
 * POST /record-transaction
 */
http.route({
  path: "/record-transaction",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-Internal-Key");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const {
        executionId,
        walletId,
        chain,
        type,
        inputData,
        valueUsd,
      } = body as {
        executionId?: string;
        walletId: string;
        chain: string;
        type: "swap" | "bridge" | "transfer" | "approve";
        inputData: any;
        valueUsd?: number;
      };

      const transactionId = await ctx.runMutation(api.transactions.create, {
        executionId: executionId as any,
        walletId: walletId as any,
        chain,
        type,
        inputData,
        valueUsd,
      });

      return new Response(
        JSON.stringify({ success: true, transactionId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Update transaction status
 * POST /update-transaction
 */
http.route({
  path: "/update-transaction",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-Internal-Key");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const {
        transactionId,
        status,
        txHash,
        outputData,
        gasUsed,
        gasPrice,
      } = body as {
        transactionId: string;
        status: "submitted" | "confirmed" | "failed" | "reverted";
        txHash?: string;
        outputData?: any;
        gasUsed?: number;
        gasPrice?: number;
      };

      if (status === "submitted" && txHash) {
        await ctx.runMutation(api.transactions.markSubmitted, {
          transactionId: transactionId as any,
          txHash,
        });
      } else if (status === "confirmed") {
        await ctx.runMutation(api.transactions.markConfirmed, {
          transactionId: transactionId as any,
          outputData,
          gasUsed,
          gasPrice,
        });
      } else if (status === "failed") {
        await ctx.runMutation(api.transactions.markFailed, {
          transactionId: transactionId as any,
          outputData,
        });
      } else if (status === "reverted") {
        await ctx.runMutation(api.transactions.markReverted, {
          transactionId: transactionId as any,
          outputData,
          gasUsed,
          gasPrice,
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
