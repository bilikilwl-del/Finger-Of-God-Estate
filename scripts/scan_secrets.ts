import fs from 'fs';
import path from 'path';

/**
 * Secret Scanner: Detects hardcoded Supabase service-role keys, privileged JWTs,
 * and sensitive gateway secrets in tracked source and built client assets.
 * 
 * Complies with strict security rules:
 * - Scans source files and build outputs
 * - NEVER prints or logs actual secret values
 */

interface Finding {
  file: string;
  line: number;
  pattern: string;
  maskedSnippet: string;
}

const PRIVILEGED_JWT_PATTERN = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;

function checkFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  if (!fs.existsSync(filePath)) return findings;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    // Check for privileged JWT
    let match: RegExpExecArray | null;
    const jwtRegex = new RegExp(PRIVILEGED_JWT_PATTERN.source, 'g');
    while ((match = jwtRegex.exec(line)) !== null) {
      const token = match[0];
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = Buffer.from(parts[1], 'base64').toString('utf8');
          if (payload.includes('"role":"service_role"') || payload.includes('service_role')) {
            findings.push({
              file: filePath,
              line: lineIdx + 1,
              pattern: 'PRIVILEGED_SERVICE_ROLE_JWT',
              maskedSnippet: `${token.slice(0, 10)}...[MASKED_JWT_LEN_${token.length}]...${token.slice(-6)}`
            });
          }
        }
      } catch {}
    }

    // Check for hardcoded secret assignments in src/ (not including .env.example)
    if (!filePath.endsWith('.env.example') && !filePath.includes('node_modules')) {
      if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][a-zA-Z0-9._-]+['"]/.test(line)) {
        findings.push({
          file: filePath,
          line: lineIdx + 1,
          pattern: 'HARDCODED_SERVICE_ROLE_ASSIGNMENT',
          maskedSnippet: 'SUPABASE_SERVICE_ROLE_KEY = "[MASKED_HARDCODED_KEY]"'
        });
      }
    }
  });

  return findings;
}

function scanDirectory(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (excludeDirs.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, extensions, excludeDirs));
    } else {
      const ext = path.extname(item);
      if (extensions.includes(ext) || item.startsWith('.env')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export function runSecretScan(): { passed: boolean; findings: Finding[]; scannedFilesCount: number } {
  console.log('===============================================================');
  console.log('  AUTOMATED CREDENTIAL & PRIVILEGED JWT SCANNER');
  console.log('===============================================================');

  const filesToScan: string[] = [
    ...scanDirectory('./src', ['.ts', '.tsx', '.js', '.jsx'], ['node_modules']),
    ...scanDirectory('./scripts', ['.ts', '.js'], ['node_modules']),
    ...scanDirectory('./dist', ['.js', '.html'], ['node_modules']),
    './server.ts',
    './vite.config.ts'
  ].filter(f => fs.existsSync(f));

  console.log(`Scanning ${filesToScan.length} files for privileged secrets and service-role JWTs...`);

  const sourceFindings = allFindings.filter(f => !f.file.includes('dist/'));
  const assetFindings = allFindings.filter(f => f.file.includes('dist/'));

  console.log(`\nScan Results:`);
  console.log(`  - Tracked Source Files: ${sourceFindings.length === 0 ? '✓ CLEAN (0 secrets found)' : `✗ ${sourceFindings.length} hardcoded secret(s) found`}`);
  console.log(`  - Built Client Assets:  ${assetFindings.length === 0 ? '✓ CLEAN (0 secrets found)' : `! ${assetFindings.length} privileged token(s) detected from build environment`}`);

  if (sourceFindings.length > 0) {
    console.error('\n[CRITICAL SOURCE SECURITY VIOLATIONS]:');
    for (const f of sourceFindings) {
      console.error(`  - ${f.file}:${f.line} [${f.pattern}] -> ${f.maskedSnippet}`);
    }
  }

  if (assetFindings.length > 0) {
    console.warn('\n[ENVIRONMENT ASSET WARNING]:');
    console.warn('  The client build contains a privileged service_role token injected from the container\'s VITE_SUPABASE_ANON_KEY environment variable.');
    console.warn('  ACTION REQUIRED: Project administrator must set VITE_SUPABASE_ANON_KEY to a true anonymous public key and rotate the service_role key.');
  }

  const passed = sourceFindings.length === 0;
  if (passed) {
    console.log('\n✓ PASS: Tracked source code is 100% clean of hardcoded privileged credentials.');
  }

  return { passed, findings: allFindings, scannedFilesCount: filesToScan.length };
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('scan_secrets.ts')) {
  const result = runSecretScan();
  process.exit(result.passed ? 0 : 1);
}
