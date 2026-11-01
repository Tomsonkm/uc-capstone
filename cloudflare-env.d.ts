declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SETUP_TOKEN?: string;
    INITIAL_CONVENOR_EMAIL?: string;
    BACKUP_JOB_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
