import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for strategies that need execution every minute
crons.interval(
  "check-strategy-triggers",
  { minutes: 1 },
  internal.scheduler.checkTriggers
);

// Clean up expired sessions every hour
crons.interval(
  "cleanup-sessions",
  { hours: 1 },
  internal.scheduler.cleanupSessions
);

// Clean up expired nonces every 15 minutes
crons.interval(
  "cleanup-nonces",
  { minutes: 15 },
  internal.scheduler.cleanupNonces
);

// Clean up old rate limit records every hour
crons.interval(
  "cleanup-rate-limits",
  { hours: 1 },
  internal.scheduler.cleanupRateLimits
);

// Clean up expired session keys every hour
crons.interval(
  "cleanup-session-keys",
  { hours: 1 },
  internal.scheduler.cleanupSessionKeys
);

export default crons;
