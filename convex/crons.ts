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

export default crons;
