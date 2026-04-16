import cron from "node-cron";
import { runGracePeriodJob } from "./gracePeriod.js";
import { syncActiveWallets } from "./balanceSync.js";

export const startCronJobs = () => {
  // Grace period check — every 30 minutes
  cron.schedule("*/30 * * * *", runGracePeriodJob);
  // Balance sync for all active wallets — every 15 minutes
  cron.schedule("*/15 * * * *", syncActiveWallets);
  console.log("⏰ Cron jobs started");
};
