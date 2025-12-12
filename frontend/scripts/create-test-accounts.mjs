import "dotenv/config";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const nowIso = () => new Date().toISOString();

const TEST_ACCOUNTS = [
  {
    role: "primary_validator",
    email:
      process.env.PRIMARY_VALIDATOR_TEST_EMAIL ??
      "primary.validator@yotouch.local",
    password: process.env.PRIMARY_VALIDATOR_TEST_PASSWORD ?? "ChangeMe@123",
    firstName: "Primary",
    lastName: "Validator",
    phoneNumber: "+2348000000001",
    nin: process.env.PRIMARY_VALIDATOR_TEST_NIN ?? "12345678901",
    bvn: process.env.PRIMARY_VALIDATOR_TEST_BVN ?? "12345678901",
    residentialAddress:
      process.env.PRIMARY_VALIDATOR_TEST_ADDRESS ??
      "12 Marina Road, Victoria Island, Lagos",
    metadata: { is_primary_validator: true },
  },
  {
    role: "secondary_validator",
    email:
      process.env.SECONDARY_VALIDATOR_TEST_EMAIL ??
      "secondary.validator@yotouch.local",
    password: process.env.SECONDARY_VALIDATOR_TEST_PASSWORD ?? "ChangeMe@123",
    firstName: "Secondary",
    lastName: "Validator",
    phoneNumber: "+2348000000002",
    nin: process.env.SECONDARY_VALIDATOR_TEST_NIN ?? "23456789012",
    bvn: process.env.SECONDARY_VALIDATOR_TEST_BVN ?? "23456789012",
    residentialAddress:
      process.env.SECONDARY_VALIDATOR_TEST_ADDRESS ??
      "24 Admiralty Way, Lekki Phase 1, Lagos",
    metadata: { is_secondary_validator: true },
  },
  {
    role: "field_agent",
    email: process.env.FIELD_AGENT_TEST_EMAIL ?? "field.agent@yotouch.local",
    password: process.env.FIELD_AGENT_TEST_PASSWORD ?? "ChangeMe@123",
    firstName: "Field",
    lastName: "Agent",
    phoneNumber: "+2348000000003",
    nin: process.env.FIELD_AGENT_TEST_NIN ?? "34567890123",
    bvn: process.env.FIELD_AGENT_TEST_BVN ?? "34567890123",
    residentialAddress:
      process.env.FIELD_AGENT_TEST_ADDRESS ?? "8 Freedom Crescent, Yaba, Lagos",
    metadata: { is_field_agent: true },
    fieldAgentProfile: {
      coverage_area:
        process.env.FIELD_AGENT_COVERAGE_AREA ?? "Test District, Lagos",
      tier: process.env.FIELD_AGENT_TIER ?? "community",
      notes: process.env.FIELD_AGENT_NOTES ?? "Seeded test field agent account",
      max_primary_validators: Number(
        process.env.FIELD_AGENT_MAX_PRIMARY_VALIDATORS ?? 5
      ),
    },
  },
  {
    role: "user",
    email: process.env.FINAL_STAGE_TEST_EMAIL ?? "final.stage@yotouch.local",
    password: process.env.FINAL_STAGE_TEST_PASSWORD ?? "ChangeMe@123",
    firstName: "Final",
    lastName: "Stage",
    phoneNumber: "+2348000000004",
    nin: process.env.FINAL_STAGE_TEST_NIN ?? "45678901234",
    bvn: process.env.FINAL_STAGE_TEST_BVN ?? "45678901234",
    residentialAddress:
      process.env.FINAL_STAGE_TEST_ADDRESS ??
      "17 Unity Close, Central Business District, Abuja",
    metadata: {},
    profileExtras: {
      verification_status: "pending",
      verification_score: 92,
    },
    verificationRequest: {
      nin_bvn: {
        nin: process.env.FINAL_STAGE_TEST_NIN ?? "45678901234",
        bvn: process.env.FINAL_STAGE_TEST_BVN ?? "45678901234",
        confirmed_at: nowIso(),
      },
      face_match_score: 90,
      liveness_score: 88,
      residential_claim: {
        address:
          process.env.FINAL_STAGE_TEST_ADDRESS ??
          "17 Unity Close, Central Business District, Abuja",
        clarity: "Street & house number",
        landmarks:
          process.env.FINAL_STAGE_TEST_LANDMARK ?? "Opposite Unity Fountain",
        directions:
          process.env.FINAL_STAGE_TEST_DIRECTIONS ??
          "White duplex with blue gate opposite Unity Fountain",
        recorded_at: nowIso(),
        match_score: 95,
      },
      address_match_score: 95,
      social_proof_score: 84,
      reputation_score: 87,
      final_score: 90,
      status: "verified",
    },
  },
];

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

async function ensureUser(account) {
  const existing = await findUserByEmail(account.email);

  if (existing) {
    console.log(`User ${account.email} already exists.`);
    return existing;
  }

  console.log(`Creating user ${account.email}...`);
  const { data, error } = await adminClient.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      first_name: account.firstName,
      last_name: account.lastName,
      full_name: `${account.firstName} ${account.lastName}`,
      phone_number: account.phoneNumber,
      ...(account.metadata ?? {}),
    },
  });

  if (error) {
    throw error;
  }

  console.log(`User ${account.email} created.`);
  return data.user;
}

async function ensureRole(userId, role) {
  const { error } = await adminClient.from("user_roles").upsert(
    {
      user_id: userId,
      role,
    },
    { onConflict: "user_id,role" }
  );

  if (error) {
    throw error;
  }

  console.log(`Role ${role} granted to ${userId}.`);
}

async function ensureProfileDetails(userId, account) {
  const payload = {
    id: userId,
    first_name: account.firstName,
    last_name: account.lastName,
    phone_number: account.phoneNumber,
    nin: account.nin,
    bvn: account.bvn,
    residential_address: account.residentialAddress,
  };

  if (account.profileExtras) {
    Object.assign(payload, account.profileExtras);
  }

  const { error } = await adminClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw error;
  }
}

const serializeJsonField = (value) => {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
};

async function ensureVerificationRequest(userId, requestData) {
  if (!requestData) return;

  const payload = {
    user_id: userId,
    updated_at: nowIso(),
    ...requestData,
    nin_bvn: serializeJsonField(requestData.nin_bvn),
    residential_claim: serializeJsonField(requestData.residential_claim),
  };

  const { data: existing, error: fetchError } = await adminClient
    .from("verification_requests")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError;
  }

  if (existing?.id) {
    const { error } = await adminClient
      .from("verification_requests")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await adminClient
      .from("verification_requests")
      .insert({ ...payload, created_at: nowIso() });

    if (error) {
      throw error;
    }
  }
}

async function ensureFieldAgentProfile(userId, profileOverrides = {}) {
  const { data, error } = await adminClient
    .from("field_agent_profiles")
    .select("id")
    .eq("agent_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (data) {
    console.log("Field agent profile already exists.");
    return data;
  }

  const payload = {
    agent_id: userId,
    coverage_area: profileOverrides.coverage_area,
    tier: profileOverrides.tier,
    notes: profileOverrides.notes,
    max_primary_validators: profileOverrides.max_primary_validators,
  };

  const { data: inserted, error: insertError } = await adminClient
    .from("field_agent_profiles")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  console.log("Field agent profile created.");
  return inserted;
}

async function main() {
  try {
    for (const account of TEST_ACCOUNTS) {
      const user = await ensureUser(account);
      await ensureRole(user.id, account.role);
      await ensureProfileDetails(user.id, account);

      if (account.fieldAgentProfile) {
        await ensureFieldAgentProfile(user.id, account.fieldAgentProfile);
      }

      if (account.verificationRequest) {
        await ensureVerificationRequest(user.id, account.verificationRequest);
      }

      console.log(
        `✓ ${account.role} ready: ${account.email} / ${account.password}`
      );
      console.log("---");
    }

    console.log("Test accounts ensured.");
  } catch (error) {
    console.error("Failed to create test accounts:", error.message ?? error);
    process.exit(1);
  }
}

main();
