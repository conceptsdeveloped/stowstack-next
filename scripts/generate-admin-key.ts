import { createAdminKey } from "../src/lib/admin-keys";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      "Usage: npx tsx scripts/generate-admin-key.ts admin@example.com"
    );
    process.exit(1);
  }

  const label = process.argv[3] || "Initial key";
  const key = await createAdminKey(email, label);
  console.log(`\nAdmin key created for ${email}:`);
  console.log(`\n  ${key}\n`);
  console.log("Save this key now. It cannot be retrieved again.\n");
}

main().catch(console.error);
