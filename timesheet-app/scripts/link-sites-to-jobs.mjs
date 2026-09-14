// One-off backfill: link every existing Timesheets site to a Hub job.
// - Exact match on normalized name -> link.
// - No match at all -> create a bare job (won -> in_progress, so it gets a
//   job number and is immediately clockable), then link.
// - Multiple ambiguous matches -> flagged, left for manual linking via the
//   site's edit page in the app (never guessed).
//
// Run once: node scripts/link-sites-to-jobs.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const { data: sites, error: sitesError } = await supabase
  .from("sites")
  .select("id, name, job_id");
if (sitesError) throw sitesError;

const { data: jobs, error: jobsError } = await supabase.from("jobs").select("id, name");
if (jobsError) throw jobsError;

const jobsByNormalizedName = new Map();
for (const job of jobs) {
  const key = normalize(job.name);
  const list = jobsByNormalizedName.get(key) ?? [];
  list.push(job);
  jobsByNormalizedName.set(key, list);
}

let linkedExisting = 0;
let created = 0;
const ambiguous = [];

for (const site of sites) {
  if (site.job_id) continue;

  const matches = jobsByNormalizedName.get(normalize(site.name)) ?? [];

  if (matches.length === 1) {
    const { error } = await supabase
      .from("sites")
      .update({ job_id: matches[0].id })
      .eq("id", site.id);
    if (error) throw error;
    linkedExisting++;
    continue;
  }

  if (matches.length > 1) {
    ambiguous.push({ site: site.name, candidates: matches.map((m) => m.name) });
    continue;
  }

  // No match at all — create a bare job for this site, won -> in_progress
  // so the existing assign_job_number() trigger fires and it's immediately
  // clockable.
  const { data: newJob, error: insertError } = await supabase
    .from("jobs")
    .insert({ name: site.name, status: "won" })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ status: "in_progress" })
    .eq("id", newJob.id);
  if (updateError) throw updateError;

  const { error: linkError } = await supabase
    .from("sites")
    .update({ job_id: newJob.id })
    .eq("id", site.id);
  if (linkError) throw linkError;

  created++;
}

console.log(`Linked to existing job: ${linkedExisting}`);
console.log(`Created a new job for:  ${created}`);
console.log(`Ambiguous, needs manual linking: ${ambiguous.length}`);
if (ambiguous.length) {
  console.log(JSON.stringify(ambiguous, null, 2));
}
