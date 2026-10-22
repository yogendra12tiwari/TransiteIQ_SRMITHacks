import admin from "firebase-admin";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getCliAccessToken(): string | null {
  const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return config.tokens?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function setCustomClaimRest(
  projectId: string,
  email: string,
  claims: Record<string, unknown>,
  token: string,
): Promise<void> {
  // 1. Lookup user by email
  const lookupUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`;
  const lookupRes = await fetch(lookupUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: [email] }),
  });

  if (!lookupRes.ok) {
    const text = await lookupRes.text();
    if (text.includes("CONFIGURATION_NOT_FOUND")) {
      console.warn(
        `Firebase Authentication is not yet activated on project "${projectId}".\n` +
          `To activate: Open https://console.firebase.google.com/project/${projectId}/authentication -> Click "Get Started" -> Enable Google Sign-In.\n` +
          `Once enabled, re-run "npm run grant:operator" to assign the operator role to ${email}.`,
      );
      return;
    }
    throw new Error(`User lookup failed for ${email} (${lookupRes.status}): ${text}`);
  }

  const lookupData = (await lookupRes.json()) as { users?: Array<{ localId: string }> };
  const uid = lookupData.users?.[0]?.localId;

  if (!uid) {
    console.warn(
      `User with email "${email}" not found in Firebase Auth yet. User will receive claim upon account creation or next grant run.`,
    );
    return;
  }

  // 2. Set custom claims on uid
  const updateUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
  const updateRes = await fetch(updateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    }),
  });

  if (!updateRes.ok) {
    const text = await updateRes.text();
    throw new Error(`Failed to set custom claim on ${uid} (${updateRes.status}): ${text}`);
  }

  console.log(`Successfully granted operator claim to ${email} (UID: ${uid})`);
}

export async function grantOperator(): Promise<void> {
  const emailsStr = process.env.OPERATOR_EMAILS;
  if (!emailsStr) {
    console.error("Error: OPERATOR_EMAILS environment variable must be provided (comma-separated list).");
    process.exit(1);
  }

  const emails = emailsStr
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const projectId = process.env.GCLOUD_PROJECT || "transiteiq";
  const cliToken = !process.env.FIRESTORE_EMULATOR_HOST ? getCliAccessToken() : null;

  if (cliToken) {
    for (const email of emails) {
      await setCustomClaimRest(projectId, email, { role: "operator" }, cliToken);
    }
    return;
  }

  // Admin SDK execution
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId });
  }

  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { role: "operator" });
      console.log(`Granted operator role to ${email} (UID: ${user.uid})`);
    } catch (err: unknown) {
      console.warn(`Could not grant to ${email}:`, err);
    }
  }
}

grantOperator().catch((err) => {
  console.error("Grant operator script error:", err);
  process.exit(1);
});
