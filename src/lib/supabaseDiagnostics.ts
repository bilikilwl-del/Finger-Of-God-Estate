import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseDiagnosticDetails {
  urlConfigured: boolean;
  keyConfigured: boolean;
  urlValid: boolean;
  keyValid: boolean;
  projectRefFromUrl?: string;
  projectRefFromKey?: string;
  refMismatch: boolean;
  detectedKeyRole?: string;
  isServiceRoleInClient: boolean;
  isTokenExpired: boolean;
  tokenExpiresAt?: string;
  authEndpointReachable: boolean;
  authHttpStatus?: number;
  restEndpointReachable: boolean;
  restHttpStatus?: number;
  latencyMs?: number;
}

export interface SupabaseDiagnosticResult {
  connected: boolean;
  configured: boolean;
  supabaseUrl: string | null;
  maskedAnonKey: string | null;
  issues: string[];
  warnings: string[];
  conflicts: string[];
  details: SupabaseDiagnosticDetails;
  timestamp: string;
}

/**
 * Safely resolves an environment variable across browser Vite and Node environments.
 */
function resolveEnv(name: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[name] === 'string') {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name];
  }
  return undefined;
}

/**
 * Masks a sensitive key string for safe console logging and reporting.
 * e.g., "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -> "eyJhbG...9gAdc"
 */
function maskKey(key?: string): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed.length <= 14) return '***';
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-6)}`;
}

/**
 * Parses JWT payload without external library dependencies.
 */
function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Verifies connectivity with Supabase using the configured VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Logs connection status, potential configuration conflicts, and missing credentials to the console.
 *
 * @param customUrl Optional explicit URL to test, defaults to VITE_SUPABASE_URL
 * @param customKey Optional explicit anon key to test, defaults to VITE_SUPABASE_ANON_KEY
 * @param silent When true, suppresses console logging and only returns the diagnostic object
 */
export async function diagnoseSupabaseConnection(
  customUrl?: string,
  customKey?: string,
  silent: boolean = false
): Promise<SupabaseDiagnosticResult> {
  const startTime = Date.now();
  const rawUrl = customUrl || resolveEnv('VITE_SUPABASE_URL');
  const rawKey = customKey || resolveEnv('VITE_SUPABASE_ANON_KEY');

  const issues: string[] = [];
  const warnings: string[] = [];
  const conflicts: string[] = [];

  const details: SupabaseDiagnosticDetails = {
    urlConfigured: false,
    keyConfigured: false,
    urlValid: false,
    keyValid: false,
    refMismatch: false,
    isServiceRoleInClient: false,
    isTokenExpired: false,
    authEndpointReachable: false,
    restEndpointReachable: false
  };

  // -------------------------------------------------------------
  // 1. CREDENTIAL VALIDATION
  // -------------------------------------------------------------
  if (!rawUrl || !rawUrl.trim()) {
    issues.push('Missing credential: VITE_SUPABASE_URL is not set or is empty.');
  } else {
    details.urlConfigured = true;
    const cleanUrl = rawUrl.trim();

    if (
      cleanUrl.includes('your-project-id.supabase.co') ||
      cleanUrl.includes('placeholder') ||
      cleanUrl.includes('example.com')
    ) {
      issues.push(`Placeholder URL detected: VITE_SUPABASE_URL is set to a template placeholder ("${cleanUrl}").`);
    } else {
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
          warnings.push(`Insecure protocol: VITE_SUPABASE_URL uses "${parsed.protocol}" instead of "https:".`);
        }
        details.urlValid = true;

        // Extract Supabase project ref from standard *.supabase.co domain
        const match = parsed.hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/i);
        if (match && match[1]) {
          details.projectRefFromUrl = match[1];
        }
      } catch {
        issues.push(`Malformed URL: VITE_SUPABASE_URL ("${cleanUrl}") cannot be parsed as a valid URL.`);
      }
    }
  }

  if (!rawKey || !rawKey.trim()) {
    issues.push('Missing credential: VITE_SUPABASE_ANON_KEY is not set or is empty.');
  } else {
    details.keyConfigured = true;
    const cleanKey = rawKey.trim();

    if (cleanKey.includes('your-anon-key') || cleanKey.includes('placeholder')) {
      issues.push('Placeholder key detected: VITE_SUPABASE_ANON_KEY is set to a template placeholder.');
    } else {
      const payload = parseJwtPayload(cleanKey);
      if (!payload) {
        issues.push('Malformed key: VITE_SUPABASE_ANON_KEY is not a valid 3-part base64-encoded JWT token.');
      } else {
        details.keyValid = true;
        details.detectedKeyRole = payload.role;

        if (payload.ref) {
          details.projectRefFromKey = payload.ref;
        }

        if (payload.exp) {
          const expTime = payload.exp * 1000;
          details.tokenExpiresAt = new Date(expTime).toISOString();
          if (Date.now() > expTime) {
            details.isTokenExpired = true;
            issues.push(`Expired key: VITE_SUPABASE_ANON_KEY expired at ${details.tokenExpiresAt}.`);
          }
        }

        // -------------------------------------------------------------
        // 2. CONFIGURATION CONFLICT CHECKS
        // -------------------------------------------------------------
        // Service Role Key Notice: Note service_role privilege level
        if (payload.role === 'service_role') {
          details.isServiceRoleInClient = true;
          warnings.push(
            'API Key Role Notice: Configured key is operating with service_role permissions.'
          );
        }

        // CONFLICT: Project Reference Mismatch between URL and Key
        if (details.projectRefFromUrl && details.projectRefFromKey) {
          if (details.projectRefFromUrl.toLowerCase() !== details.projectRefFromKey.toLowerCase()) {
            details.refMismatch = true;
            conflicts.push(
              `PROJECT MISMATCH: VITE_SUPABASE_URL points to project "${details.projectRefFromUrl}", ` +
              `but key belongs to project "${details.projectRefFromKey}".`
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 3. LIVE NETWORK CONNECTIVITY PROBE
  // -------------------------------------------------------------
  let connected = false;

  if (details.urlValid && details.keyValid && !details.refMismatch && !details.isTokenExpired) {
    const targetUrl = rawUrl!.trim();
    const targetKey = rawKey!.trim();

    try {
      // Probe 1: Ping Supabase Auth Health / Settings API
      const authProbeUrl = `${targetUrl}/auth/v1/settings`;
      const authRes = await fetch(authProbeUrl, {
        method: 'GET',
        headers: {
          apikey: targetKey,
          Authorization: `Bearer ${targetKey}`
        }
      });

      details.authHttpStatus = authRes.status;
      if (authRes.status === 200 || authRes.status === 400) {
        details.authEndpointReachable = true;
      } else if (authRes.status === 401) {
        issues.push(`Authentication failed (HTTP 401): The supplied VITE_SUPABASE_ANON_KEY was rejected by Supabase Auth.`);
      }

      // Probe 2: Ping PostgREST Schema Root API
      const restProbeUrl = `${targetUrl}/rest/v1/`;
      const restRes = await fetch(restProbeUrl, {
        method: 'GET',
        headers: {
          apikey: targetKey,
          Authorization: `Bearer ${targetKey}`
        }
      });

      details.restHttpStatus = restRes.status;
      if (restRes.status === 200 || restRes.status === 404) {
        details.restEndpointReachable = true;
      }

      // Check if client SDK client can query
      const probeClient: SupabaseClient = createClient(targetUrl, targetKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { error: probeErr } = await probeClient.from('estate_settings').select('id').limit(1);

      if (!probeErr) {
        connected = true;
      } else if (probeErr.code === 'PGRST205' || probeErr.message?.includes('schema cache')) {
        // Connected to Supabase gateway successfully, but database table has not been created yet
        connected = true;
        warnings.push(
          'Schema notice: Connected to Supabase successfully, but "public.estate_settings" was not found in the schema cache (PGRST205). ' +
          'Execute supabase_production_migration.sql in the Supabase SQL Editor to install the required application tables.'
        );
      } else if (probeErr.code === 'PGRST301' || probeErr.message?.includes('JWT')) {
        issues.push(`PostgREST Authorization error (${probeErr.code}): ${probeErr.message}`);
      } else {
        // General connection confirmed if we got a valid response code back from PostgREST
        connected = details.authEndpointReachable || details.restEndpointReachable;
      }
    } catch (networkErr: any) {
      issues.push(`Network connection failure: Unable to reach ${targetUrl}. Cause: ${networkErr?.message || networkErr}`);
    }
  }

  details.latencyMs = Date.now() - startTime;
  const isConfigured = details.urlValid && details.keyValid && issues.length === 0;

  const result: SupabaseDiagnosticResult = {
    connected,
    configured: isConfigured,
    supabaseUrl: rawUrl ? rawUrl.trim() : null,
    maskedAnonKey: maskKey(rawKey),
    issues,
    warnings,
    conflicts,
    details,
    timestamp: new Date().toISOString()
  };

  // -------------------------------------------------------------
  // 4. CONSOLE LOGGING DIAGNOSTIC REPORT
  // -------------------------------------------------------------
  if (!silent && typeof console !== 'undefined') {
    const groupTitle = connected
      ? '%c[Supabase Diagnostics] Connection: ACTIVE (CONNECTED)'
      : '%c[Supabase Diagnostics] Connection: FAILED / DEGRADED';
    const groupStyle = connected
      ? 'color: #10b981; font-weight: bold; font-size: 12px;'
      : 'color: #ef4444; font-weight: bold; font-size: 12px;';

    console.groupCollapsed ? console.groupCollapsed(groupTitle, groupStyle) : console.log(groupTitle);

    console.log('%c--- CONFIGURATION SUMMARY ---', 'color: #3b82f6; font-weight: bold;');
    console.log(`• Supabase URL:        ${result.supabaseUrl || '(Not configured)'}`);
    console.log(`• Masked Anon Key:     ${result.maskedAnonKey || '(Not configured)'}`);
    console.log(`• Key Role:            ${details.detectedKeyRole || 'Unknown'}`);
    console.log(`• Project Ref (URL):   ${details.projectRefFromUrl || 'N/A'}`);
    console.log(`• Project Ref (Key):   ${details.projectRefFromKey || 'N/A'}`);
    console.log(`• Latency Probe:       ${details.latencyMs} ms`);

    // Conflicts
    if (conflicts.length > 0) {
      console.log('\n%c--- CONFIGURATION CONFLICTS DETECTED ---', 'color: #a855f7; font-weight: bold;');
      conflicts.forEach(c => console.error(`[CONFLICT] ${c}`));
    }

    // Issues / Errors
    if (issues.length > 0) {
      console.log('\n%c--- CONFIGURATION ISSUES & ERRORS ---', 'color: #ef4444; font-weight: bold;');
      issues.forEach(i => console.error(`[ERROR] ${i}`));
    }

    // Warnings
    if (warnings.length > 0) {
      console.log('\n%c--- NOTICES & WARNINGS ---', 'color: #f59e0b; font-weight: bold;');
      warnings.forEach(w => console.warn(`[WARNING] ${w}`));
    }

    // Success Status
    if (connected && conflicts.length === 0 && issues.length === 0) {
      console.log(
        '\n%c[OK] Supabase client is properly configured and successfully communicating with remote services.',
        'color: #10b981; font-weight: bold;'
      );
    }

    if (console.groupEnd) {
      console.groupEnd();
    }
  }

  return result;
}

// Automatically bind to window object in browser environments for developer console access
if (typeof window !== 'undefined') {
  (window as any).diagnoseSupabaseConnection = diagnoseSupabaseConnection;
}
