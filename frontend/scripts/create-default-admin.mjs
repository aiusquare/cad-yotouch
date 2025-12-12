import "dotenv/config";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_ADMIN_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL ?? "admin@yotouch.local";
const DEFAULT_ADMIN_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD ?? "ChangeMe@123";
const DEFAULT_ADMIN_FIRST_NAME =
  process.env.DEFAULT_ADMIN_FIRST_NAME ?? "YoTouch";
const DEFAULT_ADMIN_LAST_NAME = process.env.DEFAULT_ADMIN_LAST_NAME ?? "Admin";

if (!SUPABASE_URL) {
  console.error(
    "Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable."
  );
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email) {
  const normalized = email.toLowerCase();
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const match = data?.users?.find(
      (user) => user.email?.toLowerCase() === normalized
    );

    if (match) {
      return match;
    }

    if (!data?.users?.length || data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureAdminUser() {
  const existingUser = await findUserByEmail(DEFAULT_ADMIN_EMAIL);

  if (existingUser) {
    console.log(`Admin user ${DEFAULT_ADMIN_EMAIL} already exists.`);
    return existingUser;
  }

  console.log(`Creating admin user ${DEFAULT_ADMIN_EMAIL}...`);
  const createResponse = await adminClient.auth.admin.createUser({
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: DEFAULT_ADMIN_FIRST_NAME,
      last_name: DEFAULT_ADMIN_LAST_NAME,
      is_admin: true,
    },
  });

  if (createResponse.error) {
    if (createResponse.error.status === 422) {
      const retryUser = await findUserByEmail(DEFAULT_ADMIN_EMAIL);
      if (retryUser) {
        console.log(
          `Admin user ${DEFAULT_ADMIN_EMAIL} detected after conflict, continuing.`
        );
        return retryUser;
      }
    }
    throw createResponse.error;
  }

  console.log("Admin user created.");
  return createResponse.data.user;
}

async function ensureAdminRole(userId) {
  const { error } = await adminClient.from("user_roles").upsert(
    {
      user_id: userId,
      role: "admin",
    },
    { onConflict: "user_id,role" }
  );

  if (error) {
    throw error;
  }

  console.log("Admin role granted.");
}

async function main() {
  try {
    const user = await ensureAdminUser();
    await ensureAdminRole(user.id);
    console.log("Default admin bootstrap complete.");
  } catch (error) {
    console.error("Failed to create default admin:", error.message ?? error);
    process.exit(1);
  }
}

main();
