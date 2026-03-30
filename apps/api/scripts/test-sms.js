#!/usr/bin/env node
require('dotenv/config');

// Usage:
//   node scripts/test-sms.js +998901234567 "Hello"
//
// Runs inside the API container as well:
//   docker exec -it darital-api node scripts/test-sms.js +998901234567 "Hello"

async function main() {
  const [phone, ...messageParts] = process.argv.slice(2);
  const message = messageParts.join(' ').trim() || 'Darital SMS test';

  if (!phone) {
    console.error('Missing phone.\nUsage: node scripts/test-sms.js +998901234567 "Hello"');
    process.exit(2);
  }

  // Dist exists in prod containers and after `pnpm --filter api build`
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SmsService } = require('../dist/sms/sms.service');
  const service = new SmsService();

  const result = await service.sendSms(phone, message);
  if (result?.success) {
    console.log(`OK: sent (messageId=${result.messageId || 'n/a'})`);
    process.exit(0);
  }

  console.error(`FAILED: ${result?.error || 'Unknown error'}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

