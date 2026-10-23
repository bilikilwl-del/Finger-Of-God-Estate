import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { serverDb, supabaseAdmin, verifyAdminToken, VerifiedAdminUser } from './database.ts';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionVoter, 
  ElectionStats, 
  ElectionResultSnapshot, 
  PositionResult,
  ElectionAuditLog,
  ElectionStatus,
  CandidateStatus
} from '../types/election.ts';

export const electionRouter = express.Router();

// ==========================================
// CONCURRENCY LOCKS & IDEMPOTENCY CACHES
// ==========================================
const inFlightBallotLocks = new Set<string>();
const ballotIdempotencyCache = new Map<string, { status: number; body: any; timestamp: number }>();

function cleanupIdempotencyCache() {
  const now = Date.now();
  for (const [key, entry] of ballotIdempotencyCache.entries()) {
    if (now - entry.timestamp > 30 * 60 * 1000) {
      ballotIdempotencyCache.delete(key);
    }
  }
}

// Middleware: Authenticate Administrator via Supabase Auth & admin_users
const requireElectionAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Administrator authentication required.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const authResult = await verifyAdminToken(token);

  if (!authResult.valid || !authResult.user) {
    return res.status(401).json({ success: false, message: authResult.error || 'Invalid administrator session.' });
  }

  (req as any).adminUser = authResult.user;
  next();
};

// Helper: Check if request has valid admin token without rejecting public requests
async function isRequestFromAuthorizedAdmin(req: Request): Promise<VerifiedAdminUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const authResult = await verifyAdminToken(token);
    if (authResult.valid && authResult.user) {
      return authResult.user;
    }
  } catch {}
  return null;
}

// Helper: Resolve authenticated resident from Authorization Bearer token using authoritative server session / Supabase Auth
async function resolveAuthenticatedResidentFromRequest(req: Request): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const cleanToken = authHeader.replace('Bearer ', '').trim();
  if (!cleanToken) return null;

  let authResidentNumber: string | null = null;
  let authUserId: string | null = null;

  // 1. Check persistent resident session store
  const localSession = serverDb.getResidentSession(cleanToken);
  if (localSession) {
    const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - localSession.created_at <= MAX_SESSION_AGE) {
      authResidentNumber = String(localSession.resident_number).trim().padStart(3, '0');
    } else {
      serverDb.deleteResidentSession(cleanToken);
      return null;
    }
  } else if (cleanToken.startsWith('eyJ')) {
    // 2. Validate with Supabase Auth JWT
    try {
      const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(cleanToken);
      if (!userErr && user) {
        authUserId = user.id;
        let resolvedRecord = await serverDb.getResidentByAuthId(user.id);

        if (!resolvedRecord && user.email) {
          const { data: emailRes } = await supabaseAdmin
            .from('residents')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();
          if (emailRes) {
            resolvedRecord = emailRes;
          }
        }

        if (!resolvedRecord && user.user_metadata?.resident_number) {
          const metaNum = String(user.user_metadata.resident_number).trim().padStart(3, '0');
          resolvedRecord = await serverDb.getResidentByNumber(metaNum);
        }

        if (resolvedRecord && resolvedRecord.resident_number) {
          authResidentNumber = String(resolvedRecord.resident_number).trim().padStart(3, '0');
        }
      }
    } catch {}
  }

  if (!authResidentNumber) return null;

  const authoritativeResident = await serverDb.getResidentByNumber(authResidentNumber);
  if (!authoritativeResident) return null;

  if (authUserId && !authoritativeResident.auth_user_id) {
    authoritativeResident.auth_user_id = authUserId;
  }

  return authoritativeResident;
}

// Helper: Authoritative server-side evaluation of whether a resident account is eligible to vote
function evaluateResidentAccountEligibility(resData: any, cleanNum: string): {
  eligible: boolean;
  httpStatus: number;
  code: string;
  message: string;
} {
  if (!resData) {
    return {
      eligible: false,
      httpStatus: 404,
      code: 'RESIDENT_NOT_FOUND',
      message: `Estate Number #${cleanNum} is not registered in the Finger of God Estate resident database.`
    };
  }

  // Reject suspended or inactive accounts
  if (resData.status !== 'Active' || resData.account_status === 'SUSPENDED') {
    return {
      eligible: false,
      httpStatus: 403,
      code: 'ACCOUNT_SUSPENDED',
      message: `Estate Number #${cleanNum} is currently ${resData.account_status === 'SUSPENDED' ? 'suspended' : 'inactive'} and is ineligible to vote. Please contact the Estate Secretariat.`
    };
  }

  // Reject unactivated accounts
  if (resData.account_activated !== true || resData.account_status === 'NOT ACTIVATED') {
    return {
      eligible: false,
      httpStatus: 403,
      code: 'ACCOUNT_NOT_ACTIVATED',
      message: `Resident account #${cleanNum} has not been activated yet. Only eligible residents with activated accounts may vote. Please activate your Resident Portal account first.`
    };
  }

  // Reject placeholder/missing phone or incomplete activation
  const phone = String(resData.phone_number || '').trim();
  if (!phone || phone.startsWith('08000000')) {
    return {
      eligible: false,
      httpStatus: 403,
      code: 'INCOMPLETE_ACTIVATION',
      message: `Resident account #${cleanNum} does not have a verified contact phone number on file. Please complete your Resident Portal activation first.`
    };
  }

  return {
    eligible: true,
    httpStatus: 200,
    code: 'ELIGIBLE',
    message: 'Resident account is active, activated, and in good standing.'
  };
}

// Helper: Mask phone number for privacy (e.g. 0802***6789)
function maskPhone(phone: string): string {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length < 8) return '******';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}***${suffix}`;
}

// Helper: Generate secure confirmation reference code (e.g. FG-E26-7K4M9P)
function generateConfirmationCode(year?: number): string {
  const yr = year ? String(year).slice(-2) : '26';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `FG-E${yr}-${rand}`;
}

// Helper: Hash with SHA-256
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper to format timestamps in WAT (West Africa Time, Africa/Lagos, UTC+1)
const formatElectionWat = (date: Date): string => {
  const datePart = date.toLocaleDateString('en-US', {
    timeZone: 'Africa/Lagos',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timePart = date.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Lagos',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart} – ${timePart} WAT`;
};

// Helper: Authoritative Server-Side Schedule Evaluation & Auto-Sync
async function evaluateAndSyncElectionSchedule(electionData: any) {
  const serverNow = new Date();
  const serverTimeIso = serverNow.toISOString();
  const startsAt = new Date(electionData.starts_at);
  const endsAt = new Date(electionData.ends_at);

  let calculatedStatus: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'PAUSED';
  let statusLabel: string;
  let isVotingOpen = false;
  let isScheduled = false;
  let isClosed = false;

  if (electionData.status === 'RESULTS_PUBLISHED') {
    calculatedStatus = 'RESULTS_PUBLISHED';
    statusLabel = 'Status: Official Results Certified';
    isClosed = true;
    isVotingOpen = false;
  } else if (electionData.status === 'PAUSED') {
    calculatedStatus = 'PAUSED';
    statusLabel = 'Status: Voting Paused';
    isVotingOpen = false;
  } else if (electionData.status === 'CLOSED') {
    calculatedStatus = 'CLOSED';
    statusLabel = 'Status: Voting Closed';
    isClosed = true;
    isVotingOpen = false;
  } else if (serverNow < startsAt) {
    calculatedStatus = 'SCHEDULED';
    statusLabel = 'Status: Scheduled — Voting Not Yet Open';
    isScheduled = true;
    isVotingOpen = false;
  } else if (serverNow >= startsAt && serverNow < endsAt) {
    if (electionData.status === 'DRAFT') {
      calculatedStatus = 'SCHEDULED';
      statusLabel = 'Status: Draft — Not Yet Opened';
      isScheduled = true;
      isVotingOpen = false;
    } else {
      calculatedStatus = 'OPEN';
      statusLabel = 'Status: Voting Open';
      isVotingOpen = true;
      if (electionData.status === 'UPCOMING') {
        await supabaseAdmin
          .from('elections')
          .update({ status: 'OPEN', updated_at: serverTimeIso })
          .eq('id', electionData.id);
        electionData.status = 'OPEN';
      }
    }
  } else {
    calculatedStatus = 'CLOSED';
    statusLabel = 'Status: Voting Closed';
    isClosed = true;
    isVotingOpen = false;
    if (electionData.status === 'OPEN' || electionData.status === 'UPCOMING') {
      await supabaseAdmin
        .from('elections')
        .update({ status: 'CLOSED', updated_at: serverTimeIso })
        .eq('id', electionData.id);
      electionData.status = 'CLOSED';
    }
  }

  return {
    serverNow,
    serverTimeIso,
    startsAt,
    endsAt,
    calculatedStatus,
    statusLabel,
    isVotingOpen,
    isScheduled,
    isClosed,
    votingOpensDisplay: formatElectionWat(startsAt),
    votingClosesDisplay: formatElectionWat(endsAt)
  };
}

// Helper: Authoritative server-side ballot tally calculation (never trusts client-submitted counts)
async function computeAuthoritativeElectionTally(election: any, actorNameOrEmail: string): Promise<ElectionResultSnapshot> {
  const id = election.id;

  // Fetch active positions
  const { data: positions } = await supabaseAdmin
    .from('election_positions')
    .select('*')
    .eq('election_id', id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  // Fetch approved candidates
  const { data: candidates } = await supabaseAdmin
    .from('election_candidates')
    .select('*')
    .eq('election_id', id)
    .eq('status', 'APPROVED')
    .order('display_order', { ascending: true });

  // Fetch anonymous ballot choices strictly joined to ballots belonging to this election
  const { data: choices, error: choicesErr } = await supabaseAdmin
    .from('election_ballot_choices')
    .select(`
      id,
      ballot_id,
      position_id,
      candidate_id,
      election_ballots!inner(election_id)
    `)
    .eq('election_ballots.election_id', id);

  if (choicesErr) {
    throw new Error(choicesErr.message);
  }

  const positionResults: PositionResult[] = (positions || []).map(pos => {
    const posCandidates = (candidates || []).filter(c => c.position_id === pos.id);
    const voteCounts: Record<string, number> = {};

    for (const cand of posCandidates) {
      voteCounts[cand.id] = 0;
    }

    for (const choice of (choices || [])) {
      if (choice.position_id === pos.id && voteCounts[choice.candidate_id] !== undefined) {
        voteCounts[choice.candidate_id] += 1;
      }
    }

    const totalPosVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

    const sortedCandidates = posCandidates
      .map(cand => {
        const votes = voteCounts[cand.id] || 0;
        const percentage = totalPosVotes > 0 ? Number(((votes / totalPosVotes) * 100).toFixed(1)) : 0;
        return {
          candidate_id: cand.id,
          full_name: cand.full_name,
          photograph_url: cand.photo_url || '',
          votes,
          percentage,
          is_winner: false,
          is_tie: false
        };
      })
      .sort((a, b) => b.votes - a.votes);

    let is_tie = false;
    let tie_message = '';

    if (sortedCandidates.length > 1 && sortedCandidates[0].votes > 0 && sortedCandidates[0].votes === sortedCandidates[1].votes) {
      is_tie = true;
      const topScore = sortedCandidates[0].votes;
      const tiedNames: string[] = [];
      for (const sc of sortedCandidates) {
        if (sc.votes === topScore) {
          sc.is_tie = true;
          tiedNames.push(sc.full_name);
        }
      }
      tie_message = `TIE DETECTED: Equal leading vote count (${topScore}) between ${tiedNames.join(' and ')}. Constitutional Article 8 mandate applies.`;
    } else if (sortedCandidates.length > 0 && sortedCandidates[0].votes > 0) {
      sortedCandidates[0].is_winner = true;
    }

    return {
      position_id: pos.id,
      position_title: pos.name,
      total_votes: totalPosVotes,
      is_tie,
      tie_message: is_tie ? tie_message : undefined,
      candidates: sortedCandidates
    };
  });

  const { count: totalEligible } = await supabaseAdmin
    .from('election_voters')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', id)
    .eq('eligible', true);

  const { count: totalBallots } = await supabaseAdmin
    .from('election_ballots')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', id);

  const eligible = totalEligible || 0;
  const ballots = totalBallots || 0;
  const turnout = eligible > 0 ? Number(((ballots / eligible) * 100).toFixed(1)) : 0;

  return {
    election_id: election.id,
    election_title: election.name,
    year: new Date(election.starts_at).getFullYear() || 2026,
    total_eligible_voters: eligible,
    total_voters: ballots,
    turnout_percentage: turnout,
    opening_at: election.starts_at,
    closing_at: election.ends_at,
    published_at: new Date().toISOString(),
    published_by: actorNameOrEmail,
    tie_resolution_rule: election.tie_breaking_rule || '',
    positions: positionResults
  };
}

// ==========================================
// 1. PUBLIC & RESIDENT ELECTION ENDPOINTS
// ==========================================

// GET /api/election/active - Returns scheduled, active, or closed election from Supabase
const handleGetPublicElection = async (_req: Request, res: Response) => {
  try {
    // 1. Look for the official election by ID first, or fallback to the latest election
    let { data: electionData, error: elecError } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', 'aee791a1-d88a-4292-b0d2-0e5f68ea7de8')
      .maybeSingle();

    if (!electionData) {
      const { data: fallback, error: fbError } = await supabaseAdmin
        .from('elections')
        .select('*')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      electionData = fallback;
      elecError = fbError;
    }

    if (elecError) {
      console.error('Error fetching election from Supabase:', elecError);
      return res.status(500).json({ success: false, message: 'Error retrieving election.' });
    }

    if (!electionData) {
      return res.status(404).json({ success: false, message: 'No election scheduled at this time.' });
    }

    const sched = await evaluateAndSyncElectionSchedule(electionData);

    // 3. Fetch active positions only for public display
    const { data: positionsData, error: posError } = await supabaseAdmin
      .from('election_positions')
      .select('*')
      .eq('election_id', electionData.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (posError) {
      return res.status(500).json({ success: false, message: 'Error retrieving election positions.' });
    }

    // 4. Strictly fetch ONLY APPROVED candidates for public/voter display
    const { data: candidatesData, error: candError } = await supabaseAdmin
      .from('election_candidates')
      .select('*')
      .eq('election_id', electionData.id)
      .eq('status', 'APPROVED')
      .order('display_order', { ascending: true });

    if (candError) {
      return res.status(500).json({ success: false, message: 'Error retrieving candidates.' });
    }

    const electionResponse: Election = {
      id: electionData.id,
      title: electionData.name,
      year: new Date(electionData.starts_at).getFullYear() || 2026,
      description: electionData.description,
      status: (sched.calculatedStatus === 'SCHEDULED' ? 'UPCOMING' : sched.calculatedStatus) as ElectionStatus,
      calculated_status: sched.calculatedStatus,
      status_label: sched.statusLabel,
      is_voting_open: sched.isVotingOpen,
      is_scheduled: sched.isScheduled,
      is_closed: sched.isClosed,
      opening_at: electionData.starts_at,
      closing_at: electionData.ends_at,
      voting_opens_display: sched.votingOpensDisplay,
      voting_closes_display: sched.votingClosesDisplay,
      server_time: sched.serverTimeIso,
      election_rules: electionData.constitution_rules || '',
      tie_resolution_rule: electionData.tie_breaking_rule || '',
      published_at: null,
      created_at: electionData.created_at,
      updated_at: electionData.updated_at
    };

    const formattedPositions: ElectionPosition[] = (positionsData || []).map(p => ({
      id: p.id,
      election_id: p.election_id,
      title: p.name,
      description: p.description || '',
      display_order: p.display_order,
      active: p.is_active,
      max_selections: p.max_selections || 1,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));

    const formattedCandidates: ElectionCandidate[] = (candidatesData || []).map(c => ({
      id: c.id,
      election_id: c.election_id,
      position_id: c.position_id,
      full_name: c.full_name,
      photograph_url: c.photo_url || '',
      biography: c.profile || '',
      candidate_statement: c.manifesto || '',
      display_order: c.display_order,
      status: c.status as CandidateStatus,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));

    return res.json({
      success: true,
      election: electionResponse,
      positions: formattedPositions,
      candidates: formattedCandidates
    });
  } catch (err: any) {
    console.error('Unhandled error in public election endpoint:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

electionRouter.get('/active', handleGetPublicElection);
electionRouter.get('/current', handleGetPublicElection);
electionRouter.get('/public', handleGetPublicElection);

// GET /api/election/voter-status - Authoritative server-side eligibility & ballot status check for logged-in resident
electionRouter.get('/voter-status', async (req: Request, res: Response) => {
  try {
    const electionIdParam = req.query.electionId ? String(req.query.electionId).trim() : '';
    const authResident = await resolveAuthenticatedResidentFromRequest(req);

    if (!authResident) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        eligible: false,
        hasVoted: false,
        code: 'UNAUTHENTICATED',
        reason: 'Please sign in to your activated Resident Portal account to vote in the estate election.'
      });
    }

    const cleanNum = String(authResident.resident_number).trim().padStart(3, '0');
    const accountEval = evaluateResidentAccountEligibility(authResident, cleanNum);

    // Find target election
    let electionQuery = supabaseAdmin.from('elections').select('*');
    if (electionIdParam) {
      electionQuery = electionQuery.eq('id', electionIdParam);
    } else {
      electionQuery = electionQuery.order('starts_at', { ascending: false });
    }
    const { data: election } = await electionQuery.limit(1).maybeSingle();

    let hasVoted = false;
    let votedAt: string | null = null;
    let voterEligible = accountEval.eligible;
    let eligibilityReason = accountEval.message;
    let code = accountEval.code;

    if (election) {
      const { data: voter } = await supabaseAdmin
        .from('election_voters')
        .select('*')
        .eq('election_id', election.id)
        .eq('resident_number', cleanNum)
        .maybeSingle();

      if (voter) {
        hasVoted = Boolean(voter.has_voted);
        votedAt = voter.voted_at || null;
        if (!voter.eligible && voter.eligibility_reason !== 'Account Not Yet Activated') {
          voterEligible = false;
          code = 'VOTER_DISQUALIFIED';
          eligibilityReason = `Estate Number #${cleanNum} is marked ineligible for this election: ${voter.eligibility_reason || 'Administrative restriction'}.`;
        }
      }
    }

    return res.json({
      success: true,
      authenticated: true,
      eligible: voterEligible,
      hasVoted,
      votedAt,
      code: hasVoted ? 'ALREADY_VOTED' : code,
      reason: hasVoted
        ? `Estate Number #${cleanNum} has already cast a confidential ballot in this election.`
        : eligibilityReason,
      resident: {
        resident_number: cleanNum,
        full_name: authResident.full_name || `Resident #${cleanNum}`,
        house_number: authResident.house_number || '',
        account_activated: Boolean(authResident.account_activated),
        account_status: authResident.account_status || (authResident.account_activated ? 'ACTIVE' : 'NOT ACTIVATED'),
        status: authResident.status || 'Active'
      }
    });
  } catch (err: any) {
    console.error('Error checking voter status:', err);
    return res.status(500).json({
      success: false,
      authenticated: false,
      eligible: false,
      hasVoted: false,
      reason: 'Server error checking voter eligibility status.'
    });
  }
});

// ==========================================
// 2. RESIDENT VOTER AUTHENTICATION & OTP
// ==========================================

// Rate limit map: residentNumber -> [timestamps]
const otpRequestRateLimits = new Map<string, number[]>();

// POST /api/election/auth/initiate - Authenticate voter via their activated Resident Account (or initiate OTP for activated account)
electionRouter.post('/auth/initiate', async (req: Request, res: Response) => {
  try {
    const { residentNumber, electionId } = req.body;

    // 1. Check if caller is authenticated with a Resident Portal session token
    const authHeader = req.headers.authorization;
    const hasBearerHeader = Boolean(authHeader && authHeader.startsWith('Bearer '));
    const authResident = hasBearerHeader ? await resolveAuthenticatedResidentFromRequest(req) : null;

    if (hasBearerHeader && !authResident) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_RESIDENT_TOKEN',
        message: 'Your Resident Portal session is invalid or has expired. Please sign in to your account again.'
      });
    }

    // If authenticated via Resident Portal token, strictly enforce that browser cannot supply a different resident number
    let cleanNum = '';
    if (authResident) {
      const authNum = String(authResident.resident_number).trim().padStart(3, '0');
      if (residentNumber !== undefined && residentNumber !== null && String(residentNumber).trim() !== '') {
        const suppliedNum = String(residentNumber).trim().padStart(3, '0');
        if (suppliedNum !== authNum) {
          if (electionId) {
            try {
              await supabaseAdmin.from('election_audit_logs').insert({
                election_id: electionId,
                action: 'SECURITY_CROSS_ACCOUNT_BLOCKED',
                actor_type: 'RESIDENT',
                actor_reference: `Plot #${authNum}`,
                description: `Blocked attempt by authenticated resident #${authNum} to initiate voting for Plot #${suppliedNum}.`
              });
            } catch {}
          }
          return res.status(403).json({
            success: false,
            code: 'CROSS_ACCOUNT_FORBIDDEN',
            message: `Security Violation: You are signed in as Resident #${authNum} and cannot vote on behalf of Estate Number #${suppliedNum}. Residents must vote strictly through their own account.`
          });
        }
      }
      cleanNum = authNum;
    } else {
      const rawNum = String(residentNumber || '').trim();
      if (!/^\d{3}$/.test(rawNum)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_RESIDENT_NUMBER',
          message: 'Please provide a valid 3-digit Estate Number between 001 and 100 (e.g. 001).'
        });
      }
      const numInt = parseInt(rawNum, 10);
      if (numInt < 1 || numInt > 100) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_RESIDENT_NUMBER',
          message: 'Estate Number must be between 001 and 100.'
        });
      }
      cleanNum = rawNum;
    }

    // 2. Find election and enforce authoritative server schedule
    let electionQuery = supabaseAdmin.from('elections').select('*');
    if (electionId) {
      electionQuery = electionQuery.eq('id', electionId);
    } else {
      electionQuery = electionQuery.eq('status', 'OPEN').order('starts_at', { ascending: false });
    }

    const { data: election, error: elecErr } = await electionQuery.limit(1).maybeSingle();

    if (elecErr || !election) {
      return res.status(400).json({
        success: false,
        code: 'NO_ACTIVE_ELECTION',
        message: 'No active election is currently open for voting.'
      });
    }

    const sched = await evaluateAndSyncElectionSchedule(election);

    if (election.status === 'PAUSED') {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_PAUSED',
        message: 'Voting is temporarily paused by the Electoral Committee. Please try again shortly.'
      });
    }

    if (sched.serverNow < sched.startsAt) {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_NOT_YET_OPEN',
        message: `Voting has not opened yet. Official voting opens on ${sched.votingOpensDisplay}.`
      });
    }

    if (sched.serverNow >= sched.endsAt || election.status === 'CLOSED' || election.status === 'RESULTS_PUBLISHED') {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_CLOSED',
        message: `Voting period for this election has closed (${sched.votingClosesDisplay}).`
      });
    }

    if (election.status !== 'OPEN') {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_NOT_OPEN',
        message: `Voting is not open. Current election status: ${election.status}.`
      });
    }

    // 3. Look up authoritative resident record from serverDb (NEVER trust client-supplied flags)
    const resData = authResident || (await serverDb.getResidentByNumber(cleanNum));
    const accountEval = evaluateResidentAccountEligibility(resData, cleanNum);

    if (!accountEval.eligible) {
      try {
        await supabaseAdmin.from('election_audit_logs').insert({
          election_id: election.id,
          action: `VOTER_REJECTED_${accountEval.code}`,
          actor_type: 'SYSTEM',
          actor_reference: `Plot #${cleanNum}`,
          description: `Rejected voting initiation for Plot #${cleanNum}: ${accountEval.message}`
        });
      } catch {}

      return res.status(accountEval.httpStatus).json({
        success: false,
        code: accountEval.code,
        message: accountEval.message
      });
    }

    // 4. Verify or register voter record in election_voters
    let { data: voter } = await supabaseAdmin
      .from('election_voters')
      .select('*')
      .eq('election_id', election.id)
      .eq('resident_number', cleanNum)
      .maybeSingle();

    if (!voter) {
      const { data: newVoter, error: insertVoterErr } = await supabaseAdmin
        .from('election_voters')
        .insert({
          election_id: election.id,
          resident_id: resData.id,
          resident_number: cleanNum,
          eligible: true,
          eligibility_reason: 'Activated Resident Account in Good Standing',
          has_voted: false
        })
        .select()
        .single();

      if (insertVoterErr || !newVoter) {
        return res.status(500).json({ success: false, message: 'Error accrediting property for election.' });
      }
      voter = newVoter;
    } else if (!voter.eligible && voter.eligibility_reason === 'Account Not Yet Activated') {
      // Resident has since activated their account — auto-upgrade their eligibility
      const { data: upgradedVoter } = await supabaseAdmin
        .from('election_voters')
        .update({
          eligible: true,
          eligibility_reason: 'Activated Resident Account in Good Standing',
          updated_at: new Date().toISOString()
        })
        .eq('id', voter.id)
        .select()
        .single();
      if (upgradedVoter) voter = upgradedVoter;
    }

    if (!voter.eligible) {
      return res.status(403).json({
        success: false,
        code: 'VOTER_DISQUALIFIED',
        message: `Estate Number #${cleanNum} is marked ineligible for this election: ${voter.eligibility_reason || 'Administrative restriction'}.`
      });
    }

    if (voter.has_voted) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_VOTE',
        message: `Estate Number #${cleanNum} has already cast a ballot in this election${voter.voted_at ? ` on ${formatElectionWat(new Date(voter.voted_at))}` : ''}. Under the Estate Constitution, each accredited resident may vote only once.`
      });
    }

    // 5. Rate Limiting for unauthenticated OTP requests
    const now = Date.now();
    if (!authResident) {
      const timestamps = otpRequestRateLimits.get(cleanNum) || [];
      const recent = timestamps.filter(t => now - t < 10 * 60 * 1000);

      if (recent.length >= 4) {
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: 'Too many verification requests. Please wait 10 minutes before trying again.'
        });
      }

      if (recent.length > 0 && now - recent[recent.length - 1] < 60 * 1000) {
        const waitSec = Math.ceil((60 * 1000 - (now - recent[recent.length - 1])) / 1000);
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: `Please wait ${waitSec} seconds before requesting a new code.`
        });
      }

      recent.push(now);
      otpRequestRateLimits.set(cleanNum, recent);
    }

    // 6. Generate Voting Session
    const otpInt = crypto.randomInt(100000, 999999);
    const otpCode = String(otpInt);
    const rawSalt = crypto.randomBytes(16).toString('hex');
    const otp_hash = sha256(rawSalt + otpCode);
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = sha256(rawSessionToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Prefix otp_salt with verification state so /ballot/submit can enforce that verification was completed
    const markedSalt = authResident
      ? `VERIFIED_ACCOUNT:${rawSalt}`
      : `PENDING_OTP:${rawSalt}`;

    const { error: sessionInsertErr } = await supabaseAdmin
      .from('election_voting_sessions')
      .insert({
        election_id: election.id,
        voter_id: voter.id,
        session_token_hash: sessionTokenHash,
        otp_hash,
        otp_salt: markedSalt,
        otp_attempts: 0,
        otp_expires_at: expiresAt,
        expires_at: expiresAt,
        consumed: false
      });

    if (sessionInsertErr) {
      console.error('Error creating voting session in DB:', sessionInsertErr);
      return res.status(500).json({ success: false, message: 'Could not create secure voting session.' });
    }

    const residentPhone = resData.phone_number;

    if (authResident) {
      return res.json({
        success: true,
        authenticatedViaAccount: true,
        message: `Accredited Resident Account #${cleanNum} (${resData.full_name || 'Verified Resident'}) authenticated. Secret ballot unlocked.`,
        sessionToken: rawSessionToken,
        residentNumber: cleanNum,
        residentName: resData.full_name || `Resident #${cleanNum}`,
        houseNumber: resData.house_number || '',
        maskedPhone: maskPhone(residentPhone),
        expiresAt
      });
    }

    return res.json({
      success: true,
      authenticatedViaAccount: false,
      message: `Verification code sent to registered contact for Estate #${cleanNum}.`,
      sessionToken: rawSessionToken,
      residentNumber: cleanNum,
      maskedPhone: maskPhone(residentPhone),
      expiresAt
    });
  } catch (err: any) {
    console.error('Error initiating voter verification:', err);
    return res.status(500).json({ success: false, message: 'Server error initiating verification.' });
  }
});

// POST /api/election/auth/verify-otp - Verify 6-digit code & unlock ballot
electionRouter.post('/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { sessionToken, otpCode } = req.body;
    if (!sessionToken || !otpCode) {
      return res.status(400).json({ success: false, message: 'Session token and 6-digit code are required.' });
    }

    const sessionTokenHash = sha256(String(sessionToken).trim());

    const { data: session, error: sessErr } = await supabaseAdmin
      .from('election_voting_sessions')
      .select('*, election_voters:voter_id(id, resident_number, eligible, has_voted)')
      .eq('session_token_hash', sessionTokenHash)
      .maybeSingle();

    if (sessErr || !session) {
      return res.status(404).json({ success: false, message: 'Voting session expired or not found. Please request a new code.' });
    }

    if (session.consumed) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_VOTE',
        message: 'This voting session has already been used to cast a ballot.'
      });
    }

    if (new Date() > new Date(session.expires_at)) {
      return res.status(403).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (session.otp_attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    const voterInfo = session.election_voters as any;
    const cleanNum = String(voterInfo?.resident_number || '').trim().padStart(3, '0');

    // Re-verify authoritative resident eligibility
    const resData = await serverDb.getResidentByNumber(cleanNum);
    const accountEval = evaluateResidentAccountEligibility(resData, cleanNum);
    if (!accountEval.eligible) {
      return res.status(accountEval.httpStatus).json({
        success: false,
        code: accountEval.code,
        message: accountEval.message
      });
    }

    if (!voterInfo?.eligible) {
      return res.status(403).json({
        success: false,
        code: 'VOTER_DISQUALIFIED',
        message: `Estate Number #${cleanNum} is not eligible to vote in this election.`
      });
    }

    if (voterInfo?.has_voted) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_VOTE',
        message: `Estate Number #${cleanNum} has already cast a ballot in this election.`
      });
    }

    // Extract raw salt regardless of prefix
    const storedSalt = String(session.otp_salt || '');
    const rawSalt = storedSalt.includes(':') ? storedSalt.split(':').slice(1).join(':') : storedSalt;

    const inputHash = sha256(rawSalt + String(otpCode).trim());
    if (inputHash !== session.otp_hash) {
      const newAttempts = session.otp_attempts + 1;
      await supabaseAdmin
        .from('election_voting_sessions')
        .update({ otp_attempts: newAttempts })
        .eq('id', session.id);

      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`
      });
    }

    // Mark session as VERIFIED_OTP so /ballot/submit permits submission
    await supabaseAdmin
      .from('election_voting_sessions')
      .update({ otp_salt: `VERIFIED_OTP:${rawSalt}` })
      .eq('id', session.id);

    return res.json({
      success: true,
      message: 'Voter authenticated successfully. Ballot unlocked.',
      voter: {
        resident_number: cleanNum,
        eligible: true
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error verifying code.' });
  }
});

// ==========================================
// 3. FINAL BALLOT SUBMISSION (ATOMIC SECRET BALLOT)
// ==========================================

// POST /api/election/ballot/submit - Cast confidential ballot transactionally via PostgreSQL RPC
electionRouter.post('/ballot/submit', async (req: Request, res: Response) => {
  cleanupIdempotencyCache();

  const { sessionToken, electionId, idempotencyKey } = req.body;
  const selections = Array.isArray(req.body.selections)
    ? req.body.selections
    : Array.isArray(req.body.choices)
    ? req.body.choices
    : null;

  if (!sessionToken || !electionId || !Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_BALLOT_PAYLOAD',
      message: 'Invalid ballot submission payload. Please select a candidate for each active position.'
    });
  }

  const sessionTokenHash = sha256(String(sessionToken).trim());
  const normalizedSelections = selections.map((s: any) => ({
    position_id: String(s.positionId || s.position_id || '').trim(),
    candidate_id: String(s.candidateId || s.candidate_id || '').trim()
  }));
  const selectionsFingerprint = sha256(JSON.stringify(normalizedSelections));
  const idempKey = idempotencyKey
    ? `idemp:${sessionTokenHash}:${String(idempotencyKey).trim()}`
    : `sess:${sessionTokenHash}:${selectionsFingerprint}`;

  // 1. Check idempotency cache for repeated network retries of the exact same committed ballot
  const cachedResult = ballotIdempotencyCache.get(idempKey);
  if (cachedResult) {
    return res.status(cachedResult.status).json(cachedResult.body);
  }

  // 2. Check in-flight lock for sessionTokenHash
  if (inFlightBallotLocks.has(sessionTokenHash)) {
    return res.status(409).json({
      success: false,
      code: 'SUBMISSION_IN_PROGRESS',
      message: 'Your ballot submission is currently being processed. Please do not refresh or click submit multiple times.'
    });
  }

  inFlightBallotLocks.add(sessionTokenHash);
  let voterLockKey: string | null = null;

  try {
    // 3. Look up voting session & associated voter
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('election_voting_sessions')
      .select('*, election_voters:voter_id(id, election_id, resident_number, eligible, eligibility_reason, has_voted, voted_at)')
      .eq('session_token_hash', sessionTokenHash)
      .eq('election_id', electionId)
      .maybeSingle();

    if (sessErr || !session) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_VOTING_SESSION',
        message: 'Invalid or unrecognized voting session. Please authenticate through your resident account again.'
      });
    }

    const voter = session.election_voters as any;
    if (!voter || !voter.resident_number) {
      return res.status(403).json({
        success: false,
        code: 'VOTER_NOT_FOUND',
        message: 'Voter accreditation record not found for this session.'
      });
    }

    const cleanNum = String(voter.resident_number).trim().padStart(3, '0');
    voterLockKey = `voter:${electionId}:${cleanNum}`;

    // Acquire per-voter concurrency lock (blocks parallel multi-tab submissions across multiple sessions)
    if (inFlightBallotLocks.has(voterLockKey)) {
      return res.status(409).json({
        success: false,
        code: 'SUBMISSION_IN_PROGRESS',
        message: 'Another ballot submission is already in progress for your resident account.'
      });
    }
    inFlightBallotLocks.add(voterLockKey);

    // 4. If Authorization Bearer header is provided, ensure it matches the voting session's resident
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authResident = await resolveAuthenticatedResidentFromRequest(req);
      if (!authResident) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_RESIDENT_TOKEN',
          message: 'Your Resident Portal session has expired. Please sign in again.'
        });
      }
      const authNum = String(authResident.resident_number).trim().padStart(3, '0');
      if (authNum !== cleanNum) {
        await supabaseAdmin.from('election_audit_logs').insert({
          election_id: electionId,
          action: 'SECURITY_CROSS_ACCOUNT_BALLOT_BLOCKED',
          actor_type: 'RESIDENT',
          actor_reference: `Plot #${authNum}`,
          description: `Blocked attempt by Resident #${authNum} to submit a ballot using a session belonging to Plot #${cleanNum}.`
        });
        return res.status(403).json({
          success: false,
          code: 'CROSS_ACCOUNT_FORBIDDEN',
          message: 'Security Violation: Voting session does not match your authenticated resident account.'
        });
      }
    }

    // 5. Enforce that the voting session was actually verified (either via authenticated Resident Account or OTP)
    const saltStr = String(session.otp_salt || '');
    if (saltStr.startsWith('PENDING_OTP:')) {
      return res.status(401).json({
        success: false,
        code: 'OTP_NOT_VERIFIED',
        message: 'Voter authentication has not been completed for this session. Please verify your code or sign in to your resident account.'
      });
    }

    // 6. Check if voter or session already cast a ballot
    if (session.consumed || voter.has_voted) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_VOTE',
        message: `Estate Number #${cleanNum} has already cast a ballot in this election. Duplicate votes are strictly prohibited.`
      });
    }

    if (new Date() > new Date(session.expires_at)) {
      return res.status(403).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Your voting session has expired. Please reopen the ballot to re-authenticate.'
      });
    }

    // 7. Authoritative resident record re-verification (guards against mid-session account suspension/deactivation)
    const resData = await serverDb.getResidentByNumber(cleanNum);
    const accountEval = evaluateResidentAccountEligibility(resData, cleanNum);
    if (!accountEval.eligible) {
      return res.status(accountEval.httpStatus).json({
        success: false,
        code: accountEval.code,
        message: accountEval.message
      });
    }

    if (!voter.eligible) {
      return res.status(403).json({
        success: false,
        code: 'VOTER_DISQUALIFIED',
        message: `Estate Number #${cleanNum} is not eligible to vote: ${voter.eligibility_reason || 'Administrative restriction'}.`
      });
    }

    // 8. Authoritative election status & schedule enforcement
    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({
        success: false,
        code: 'ELECTION_NOT_FOUND',
        message: 'Election not found.'
      });
    }

    const sched = await evaluateAndSyncElectionSchedule(election);

    if (election.status !== 'OPEN' || !sched.isVotingOpen) {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_NOT_OPEN',
        message: sched.serverNow >= sched.endsAt
          ? `Voting has closed (${sched.votingClosesDisplay}). Late ballots cannot be accepted.`
          : sched.serverNow < sched.startsAt
          ? `Voting has not yet opened (${sched.votingOpensDisplay}).`
          : `Voting is currently ${election.status} and cannot accept ballots.`
      });
    }

    // 9. Validate ballot choices against active positions and APPROVED candidates
    const { data: activePositions } = await supabaseAdmin
      .from('election_positions')
      .select('id, name, is_active')
      .eq('election_id', electionId)
      .eq('is_active', true);

    const { data: approvedCandidates } = await supabaseAdmin
      .from('election_candidates')
      .select('id, position_id, full_name, status')
      .eq('election_id', electionId)
      .eq('status', 'APPROVED');

    const posMap = new Map<string, string>();
    for (const p of (activePositions || [])) {
      posMap.set(p.id, p.name);
    }

    const approvedCandMap = new Map<string, { position_id: string; full_name: string }>();
    const positionsWithApprovedCandidates = new Set<string>();
    for (const c of (approvedCandidates || [])) {
      approvedCandMap.set(c.id, { position_id: c.position_id, full_name: c.full_name });
      if (posMap.has(c.position_id)) {
        positionsWithApprovedCandidates.add(c.position_id);
      }
    }

    if (positionsWithApprovedCandidates.size === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_BALLOT_CANDIDATES',
        message: 'This election does not have any approved candidates on the ballot.'
      });
    }

    const seenPositions = new Set<string>();
    for (const choice of normalizedSelections) {
      if (!choice.position_id || !choice.candidate_id) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SELECTION',
          message: 'Every ballot selection must specify a valid position and candidate.'
        });
      }
      if (!posMap.has(choice.position_id)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_POSITION',
          message: 'Ballot contains an inactive or invalid position.'
        });
      }
      if (seenPositions.has(choice.position_id)) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_POSITION_CHOICE',
          message: `Multiple selections submitted for position "${posMap.get(choice.position_id)}". Only one candidate may be selected per position.`
        });
      }
      seenPositions.add(choice.position_id);

      const candInfo = approvedCandMap.get(choice.candidate_id);
      if (!candInfo || candInfo.position_id !== choice.position_id) {
        return res.status(400).json({
          success: false,
          code: 'UNAPPROVED_OR_INVALID_CANDIDATE',
          message: `Selected candidate is not an approved candidate for "${posMap.get(choice.position_id)}".`
        });
      }
    }

    // Ensure all active positions that have approved candidates have been selected
    const missingPositions: string[] = [];
    for (const posId of positionsWithApprovedCandidates) {
      if (!seenPositions.has(posId)) {
        missingPositions.push(posMap.get(posId) || posId);
      }
    }
    if (missingPositions.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'INCOMPLETE_BALLOT',
        message: `Please select a candidate for all contested positions. Missing: ${missingPositions.join(', ')}.`
      });
    }

    // 10. Execute atomic PostgreSQL transaction via cast_ballot() RPC
    const electionYear = new Date(election.starts_at).getFullYear() || 2026;
    const confirmationCode = generateConfirmationCode(electionYear);

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('cast_ballot', {
      p_election_id: electionId,
      p_session_token_hash: sessionTokenHash,
      p_ballot_reference: confirmationCode,
      p_choices: normalizedSelections
    });

    if (rpcError) {
      console.error('RPC cast_ballot execution error:', rpcError);
      const isDuplicate = rpcError.message?.toLowerCase().includes('already') || rpcError.code === '23505';
      return res.status(isDuplicate ? 409 : 500).json({
        success: false,
        code: isDuplicate ? 'DUPLICATE_VOTE' : 'TRANSACTION_FAILED',
        message: isDuplicate
          ? 'A ballot has already been recorded for this resident account.'
          : rpcError.message || 'Database transaction error processing ballot.'
      });
    }

    if (!rpcResult || !rpcResult.success) {
      const msg = String(rpcResult?.message || 'Ballot could not be recorded.');
      const isDuplicate = msg.toLowerCase().includes('already');
      return res.status(isDuplicate ? 409 : 400).json({
        success: false,
        code: isDuplicate ? 'DUPLICATE_VOTE' : 'BALLOT_REJECTED',
        message: msg
      });
    }

    const successPayload = {
      success: true,
      code: 'BALLOT_COMMITTED',
      message: rpcResult.message || 'Your confidential ballot has been committed to the official election ledger.',
      confirmationCode: rpcResult.confirmation_code,
      submittedAt: rpcResult.submitted_at
    };

    // Cache committed response for idempotent network retries
    ballotIdempotencyCache.set(idempKey, {
      status: 200,
      body: successPayload,
      timestamp: Date.now()
    });

    return res.status(200).json(successPayload);
  } catch (err: any) {
    console.error('Error submitting ballot:', err);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Server error processing ballot.'
    });
  } finally {
    inFlightBallotLocks.delete(sessionTokenHash);
    if (voterLockKey) {
      inFlightBallotLocks.delete(voterLockKey);
    }
  }
});

// ==========================================
// 4. ADMIN ELECTION MANAGEMENT
// ==========================================

// Explicit guard blocking any attempt by admins or anyone to read or modify individual ballots
electionRouter.all('/admin/elections/:id/ballots*', requireElectionAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUser = (req as any).adminUser as VerifiedAdminUser;
  try {
    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'SECURITY_BALLOT_INSPECTION_BLOCKED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Blocked administrative attempt (${req.method} ${req.originalUrl}) to access or modify sealed anonymous ballots.`
    });
  } catch {}
  return res.status(403).json({
    success: false,
    code: 'BALLOT_SECRECY_PROTECTED',
    message: 'Ballot Secrecy Violation: Individual submitted ballots are cryptographically isolated and cannot be viewed, edited, or deleted by administrators.'
  });
});

// GET /api/election/admin/elections - List all elections with metrics
electionRouter.get('/admin/elections', requireElectionAdmin, async (_req: Request, res: Response) => {
  try {
    const { data: elections, error } = await supabaseAdmin
      .from('elections')
      .select('*')
      .order('starts_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: 'Error fetching elections.' });
    }

    const formatted = await Promise.all((elections || []).map(async (e) => {
      const sched = await evaluateAndSyncElectionSchedule(e);

      const { count: posCount } = await supabaseAdmin
        .from('election_positions')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', e.id);

      const { count: candCount } = await supabaseAdmin
        .from('election_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', e.id);

      const { count: voterCount } = await supabaseAdmin
        .from('election_voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', e.id)
        .eq('eligible', true);

      const { count: votedCount } = await supabaseAdmin
        .from('election_voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', e.id)
        .eq('has_voted', true);

      const { count: ballotCount } = await supabaseAdmin
        .from('election_ballots')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', e.id);

      const eligible = voterCount || 0;
      const cast = ballotCount ?? votedCount ?? 0;
      const turnout = eligible > 0 ? Number(((cast / eligible) * 100).toFixed(1)) : 0;

      return {
        id: e.id,
        title: e.name,
        year: new Date(e.starts_at).getFullYear() || 2026,
        description: e.description,
        status: e.status,
        calculated_status: sched.calculatedStatus,
        status_label: sched.statusLabel,
        is_voting_open: sched.isVotingOpen,
        opening_at: e.starts_at,
        closing_at: e.ends_at,
        voting_opens_display: sched.votingOpensDisplay,
        voting_closes_display: sched.votingClosesDisplay,
        election_rules: e.constitution_rules,
        tie_resolution_rule: e.tie_breaking_rule,
        positions_count: posCount || 0,
        candidates_count: candCount || 0,
        eligible_voters_count: eligible,
        ballots_submitted_count: cast,
        turnout_percentage: turnout,
        created_at: e.created_at,
        updated_at: e.updated_at
      };
    }));

    return res.json({ success: true, elections: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving elections.' });
  }
});

// POST /api/election/admin/elections - Create new election in Supabase
electionRouter.post('/admin/elections', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { title, year, description, opening_at, closing_at, election_rules, tie_resolution_rule } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Election title is required.' });
    }

    const startsAt = opening_at ? new Date(opening_at) : new Date();
    const endsAt = closing_at ? new Date(closing_at) : new Date(Date.now() + 14 * 86400000);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return res.status(400).json({
        success: false,
        message: 'Closing date and time must be later than the opening date and time.'
      });
    }

    const electionCode = `FOG-ELEC-${year || 2026}-${Date.now().toString(36).toUpperCase()}`;

    const { data: newElection, error } = await supabaseAdmin
      .from('elections')
      .insert({
        election_code: electionCode,
        name: String(title).trim(),
        description: String(description || '').trim(),
        status: 'DRAFT',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        constitution_rules: election_rules || '1. One vote per accredited resident 001–100.\n2. Secret ballot.',
        tie_breaking_rule: tie_resolution_rule || 'Run-off election within 7 days in accordance with Article 8.',
        created_by: adminUser.email
      })
      .select()
      .single();

    if (error || !newElection) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to create election.' });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: newElection.id,
      action: 'ELECTION_CREATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Election created: "${newElection.name}" (${year || 2026})`
    });

    return res.json({
      success: true,
      election: {
        id: newElection.id,
        title: newElection.name,
        year: year || 2026,
        status: newElection.status,
        opening_at: newElection.starts_at,
        closing_at: newElection.ends_at,
        created_at: newElection.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error creating election.' });
  }
});

// PUT /api/election/admin/elections/:id - Update election metadata (Protected once voting begins unless Emergency Procedure)
electionRouter.put('/admin/elections/:id', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      opening_at,
      closing_at,
      election_rules,
      tie_resolution_rule,
      emergencyOverride,
      emergencyReason
    } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: existing, error: findErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (existing.status === 'RESULTS_PUBLISHED') {
      return res.status(403).json({
        success: false,
        code: 'ELECTION_FINALIZED',
        message: 'Cannot modify election settings after official results have been certified and published.'
      });
    }

    const { count: ballotsCount } = await supabaseAdmin
      .from('election_ballots')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', id);

    const votingHasBegun = existing.status === 'OPEN' || existing.status === 'PAUSED' || existing.status === 'CLOSED' || (ballotsCount || 0) > 0;

    if (votingHasBegun) {
      const cleanReason = String(emergencyReason || '').trim();
      if (!emergencyOverride || cleanReason.length < 10) {
        await supabaseAdmin.from('election_audit_logs').insert({
          election_id: id,
          action: 'CONFIG_CHANGE_BLOCKED',
          actor_type: 'ADMIN',
          actor_reference: adminUser.email,
          description: `Blocked unapproved configuration change while election is ${existing.status} (Ballots cast: ${ballotsCount || 0}).`
        });
        return res.status(403).json({
          success: false,
          code: 'EMERGENCY_OVERRIDE_REQUIRED',
          message: 'Election settings are locked once voting has begun. Changes require invoking the documented Emergency Procedure (emergencyOverride: true with a detailed emergencyReason of at least 10 characters).'
        });
      }
    }

    const newStartsAt = opening_at ? new Date(opening_at) : new Date(existing.starts_at);
    const newEndsAt = closing_at ? new Date(closing_at) : new Date(existing.ends_at);
    if (isNaN(newStartsAt.getTime()) || isNaN(newEndsAt.getTime()) || newEndsAt <= newStartsAt) {
      return res.status(400).json({
        success: false,
        message: 'Closing date and time must be later than the opening date and time.'
      });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (title) updates.name = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (opening_at) updates.starts_at = newStartsAt.toISOString();
    if (closing_at) updates.ends_at = newEndsAt.toISOString();
    if (election_rules !== undefined) updates.constitution_rules = election_rules;
    if (tie_resolution_rule !== undefined) updates.tie_breaking_rule = tie_resolution_rule;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('elections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: votingHasBegun ? 'EMERGENCY_CONFIG_OVERRIDE' : 'ELECTION_UPDATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: votingHasBegun
        ? `EMERGENCY OVERRIDE configuration update for "${updated.name}". Reason: ${String(emergencyReason).trim()}`
        : `Election configuration updated for "${updated.name}"`
    });

    return res.json({ success: true, election: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error updating election.' });
  }
});

// POST /api/election/admin/elections/:id/status - Change status in Supabase with schedule & integrity protections
electionRouter.post('/admin/elections/:id/status', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const validStatuses = ['DRAFT', 'UPCOMING', 'OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status specified.' });
    }

    const { data: election, error: findErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const oldStatus = election.status;

    const { count: ballotsCount } = await supabaseAdmin
      .from('election_ballots')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', id);

    // Protect cast ballots: cannot revert to DRAFT or UPCOMING if ballots have been cast
    if ((ballotsCount || 0) > 0 && (status === 'DRAFT' || status === 'UPCOMING')) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_REVERT_WITH_BALLOTS',
        message: `Cannot revert election to ${status} because ${ballotsCount} confidential ballot(s) have already been cast.`
      });
    }

    // Prevent publishing results directly via status toggle without certified calculation or while voting is open
    if (status === 'RESULTS_PUBLISHED' && oldStatus !== 'CLOSED' && oldStatus !== 'RESULTS_PUBLISHED') {
      return res.status(400).json({
        success: false,
        code: 'MUST_CLOSE_AND_CERTIFY_FIRST',
        message: 'Election must be CLOSED and tallied via the official result certification workflow before publishing results.'
      });
    }

    // Require documented reason for pausing, closing early, or reopening once voting has begun
    if (['OPEN', 'PAUSED', 'CLOSED'].includes(oldStatus) && (!reason || String(reason).trim().length < 5)) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'A documented audit reason (at least 5 characters) is required when changing election status after voting has been scheduled or opened.'
      });
    }

    const nowIso = new Date().toISOString();
    const updatePayload: any = { status, updated_at: nowIso };

    const { error: updateErr } = await supabaseAdmin
      .from('elections')
      .update(updatePayload)
      .eq('id', id);

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: `ELECTION_STATUS_${status}`,
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Election status changed from ${oldStatus} to ${status}. Reason: ${reason || 'Administrative action'}.`
    });

    return res.json({
      success: true,
      message: `Status updated from ${oldStatus} to ${status}.`,
      status
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error updating status.' });
  }
});

// POST /api/election/admin/elections/:id/positions - Add position in Supabase
electionRouter.post('/admin/elections/:id/positions', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, display_order, max_selections } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Position title is required.' });
    }

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('status, name')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add new positions while election status is ${election.status}.`
      });
    }

    const { data: newPos, error } = await supabaseAdmin
      .from('election_positions')
      .insert({
        election_id: id,
        name: String(title).trim(),
        description: String(description || '').trim(),
        display_order: display_order || 1,
        max_selections: max_selections || 1,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'POSITION_CREATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Executive position "${newPos.name}" added (Order: ${newPos.display_order})`
    });

    return res.json({ success: true, position: newPos });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error adding position.' });
  }
});

// PUT /api/election/admin/elections/:id/positions/:positionId - Update position before election opens
electionRouter.put('/admin/elections/:id/positions/:positionId', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, positionId } = req.params;
    const { title, description, display_order, max_selections, is_active, active } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('status, name')
      .eq('id', id)
      .single();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit positions while election status is ${election.status}.`
      });
    }

    const updateFields: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateFields.name = String(title).trim();
    if (description !== undefined) updateFields.description = String(description).trim();
    if (display_order !== undefined) updateFields.display_order = Number(display_order);
    if (max_selections !== undefined) updateFields.max_selections = Number(max_selections);
    if (is_active !== undefined) updateFields.is_active = Boolean(is_active);
    else if (active !== undefined) updateFields.is_active = Boolean(active);

    const { data: updatedPos, error } = await supabaseAdmin
      .from('election_positions')
      .update(updateFields)
      .eq('id', positionId)
      .eq('election_id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'POSITION_UPDATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Position "${updatedPos.name}" updated (Active: ${updatedPos.is_active}, Order: ${updatedPos.display_order})`
    });

    return res.json({
      success: true,
      position: {
        id: updatedPos.id,
        election_id: updatedPos.election_id,
        title: updatedPos.name,
        description: updatedPos.description,
        display_order: updatedPos.display_order,
        active: updatedPos.is_active,
        max_selections: updatedPos.max_selections,
        created_at: updatedPos.created_at,
        updated_at: updatedPos.updated_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error updating position.' });
  }
});

// POST /api/election/admin/elections/:id/candidates - Add candidate in Supabase
electionRouter.post('/admin/elections/:id/candidates', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position_id, full_name, photograph_url, biography, candidate_statement, display_order } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    if (!position_id || !full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, message: 'Position selection and candidate full name are required.' });
    }

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot register new candidates while election is in ${election.status} status.`
      });
    }

    const { data: positionRecord, error: posErr } = await supabaseAdmin
      .from('election_positions')
      .select('id, name')
      .eq('id', position_id)
      .eq('election_id', id)
      .maybeSingle();

    if (posErr || !positionRecord) {
      return res.status(400).json({ success: false, message: 'Selected position is not part of this election.' });
    }

    const cleanName = String(full_name).trim();
    const { data: existingCand } = await supabaseAdmin
      .from('election_candidates')
      .select('id')
      .eq('election_id', id)
      .eq('position_id', position_id)
      .ilike('full_name', cleanName)
      .maybeSingle();

    if (existingCand) {
      return res.status(400).json({
        success: false,
        message: `A candidate with the name "${cleanName}" is already registered for ${positionRecord.name}.`
      });
    }

    const { data: newCand, error } = await supabaseAdmin
      .from('election_candidates')
      .insert({
        election_id: id,
        position_id,
        full_name: cleanName,
        photo_url: photograph_url || '',
        profile: String(biography || '').trim(),
        manifesto: String(candidate_statement || '').trim(),
        status: 'PENDING',
        display_order: display_order || 1
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'CANDIDATE_REGISTERED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Candidate "${newCand.full_name}" registered for position "${positionRecord.name}" (Status: PENDING)`
    });

    return res.json({ success: true, candidate: newCand, message: 'Candidate added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error adding candidate.' });
  }
});

// PUT /api/election/admin/elections/:id/candidates/:candidateId/status - Update candidate status
electionRouter.put('/admin/elections/:id/candidates/:candidateId/status', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, candidateId } = req.params;
    const { status } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate status.' });
    }

    const { data: election } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      await supabaseAdmin.from('election_audit_logs').insert({
        election_id: id,
        action: 'CANDIDATE_STATUS_CHANGE_BLOCKED',
        actor_type: 'ADMIN',
        actor_reference: adminUser.email,
        description: `Blocked attempt to change candidate ${candidateId} status to ${status} while election is ${election.status}.`
      });
      return res.status(400).json({
        success: false,
        message: `Cannot modify candidate ballot status once voting has begun (current status: ${election.status}).`
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('election_candidates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', candidateId)
      .eq('election_id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'CANDIDATE_STATUS_UPDATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Candidate "${updated.full_name}" status updated to ${status}`
    });

    return res.json({ success: true, candidate: updated, message: `Candidate status updated to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error updating candidate status.' });
  }
});

// PUT /api/election/admin/elections/:id/candidates/:candidateId - Update candidate details
electionRouter.put('/admin/elections/:id/candidates/:candidateId', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, candidateId } = req.params;
    const { position_id, full_name, photograph_url, biography, candidate_statement, display_order } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: election } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .single();

    if (election && ['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit candidates while election status is ${election.status}.`
      });
    }

    const updateFields: any = { updated_at: new Date().toISOString() };
    if (position_id !== undefined) {
      const { data: posRecord, error: posErr } = await supabaseAdmin
        .from('election_positions')
        .select('id, name')
        .eq('id', position_id)
        .eq('election_id', id)
        .maybeSingle();

      if (posErr || !posRecord) {
        return res.status(400).json({ success: false, message: 'Selected position is not part of this election.' });
      }
      updateFields.position_id = position_id;
    }
    if (full_name !== undefined) updateFields.full_name = String(full_name).trim();
    if (photograph_url !== undefined) updateFields.photo_url = photograph_url;
    if (biography !== undefined) updateFields.profile = String(biography).trim();
    if (candidate_statement !== undefined) updateFields.manifesto = String(candidate_statement).trim();
    if (display_order !== undefined) updateFields.display_order = Number(display_order);

    const { data: updated, error } = await supabaseAdmin
      .from('election_candidates')
      .update(updateFields)
      .eq('id', candidateId)
      .eq('election_id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'CANDIDATE_UPDATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Candidate "${updated.full_name}" details updated`
    });

    return res.json({ success: true, candidate: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error updating candidate.' });
  }
});

// DELETE /api/election/admin/elections/:id/candidates/:candidateId - Delete candidate
electionRouter.delete('/admin/elections/:id/candidates/:candidateId', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, candidateId } = req.params;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: election } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (election && ['OPEN', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete candidates while election status is ${election.status}.`
      });
    }

    const { data: candidate, error: fetchErr } = await supabaseAdmin
      .from('election_candidates')
      .select('full_name, position_id')
      .eq('id', candidateId)
      .eq('election_id', id)
      .maybeSingle();

    if (fetchErr || !candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    const { error: delErr } = await supabaseAdmin
      .from('election_candidates')
      .delete()
      .eq('id', candidateId)
      .eq('election_id', id);

    if (delErr) {
      return res.status(500).json({ success: false, message: delErr.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'CANDIDATE_DELETED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Candidate "${candidate.full_name}" was deleted.`
    });

    return res.json({ success: true, message: 'Candidate deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error deleting candidate.' });
  }
});

// GET /api/election/admin/elections/:id/voters - List accredited voters (strictly isolated from ballot choices)
electionRouter.get('/admin/elections/:id/voters', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: voters, error } = await supabaseAdmin
      .from('election_voters')
      .select(`
        id,
        election_id,
        resident_number,
        resident_id,
        eligible,
        eligibility_reason,
        has_voted,
        voted_at,
        created_at,
        residents:resident_id (full_name, phone_number, house_number, account_activated, account_status, status)
      `)
      .eq('election_id', id)
      .order('resident_number', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const allResidents = await serverDb.getResidents();
    const resMap = new Map<string, any>();
    for (const r of (allResidents || [])) {
      resMap.set(String(r.resident_number).trim().padStart(3, '0'), r);
    }

    const formatted = (voters || []).map(v => {
      const cleanNum = String(v.resident_number).trim().padStart(3, '0');
      const dbRes = (v.residents as any) || resMap.get(cleanNum) || {};
      const localRes = resMap.get(cleanNum) || {};
      const accountActivated = Boolean(dbRes.account_activated ?? localRes.account_activated);
      const accountStatus = dbRes.account_status || localRes.account_status || (accountActivated ? 'ACTIVE' : 'NOT ACTIVATED');
      const resStatus = dbRes.status || localRes.status || 'Active';

      return {
        id: v.id,
        election_id: v.election_id,
        resident_id: v.resident_id,
        resident_number: cleanNum,
        full_name: dbRes.full_name || localRes.full_name || `Estate Plot #${cleanNum}`,
        phone_number: dbRes.phone_number || localRes.phone_number || '',
        house_number: dbRes.house_number || localRes.house_number || '',
        account_activated: accountActivated,
        account_status: accountStatus,
        resident_status: resStatus,
        eligible: v.eligible,
        eligibility_reason: v.eligibility_reason,
        has_voted: v.has_voted,
        ballot_submitted_at: v.voted_at,
        created_at: v.created_at,
        updated_at: v.created_at
      };
    });

    return res.json({ success: true, voters: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error fetching voters.' });
  }
});

// POST /api/election/admin/elections/:id/voters/sync - Sync resident register (001 - 100) into Supabase
electionRouter.post('/admin/elections/:id/voters/sync', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const allResidents = await serverDb.getResidents();
    const residents = (allResidents || []).filter((r: any) => r.status === 'Active');

    // Fetch existing voter rows so we never overwrite has_voted or manual disqualifications
    const { data: existingVoters } = await supabaseAdmin
      .from('election_voters')
      .select('resident_number, eligible, eligibility_reason, has_voted')
      .eq('election_id', id);

    const existingMap = new Map<string, any>();
    for (const ev of (existingVoters || [])) {
      existingMap.set(String(ev.resident_number).trim().padStart(3, '0'), ev);
    }

    let syncedCount = 0;
    let activatedEligibleCount = 0;

    for (const r of (residents || [])) {
      const cleanNum = String(r.resident_number).trim().padStart(3, '0');
      const isActivatedAndActive = Boolean(
        r.account_activated === true &&
        r.status === 'Active' &&
        r.account_status !== 'SUSPENDED' &&
        r.account_status !== 'NOT ACTIVATED' &&
        r.phone_number &&
        !String(r.phone_number).startsWith('08000000')
      );

      const prev = existingMap.get(cleanNum);
      // Preserve manual admin disqualifications
      const isManuallyDisqualified = prev && !prev.eligible && prev.eligibility_reason && prev.eligibility_reason !== 'Account Not Yet Activated';

      const eligibleVal = isManuallyDisqualified ? false : (prev?.has_voted ? true : isActivatedAndActive);
      const reasonVal = isManuallyDisqualified
        ? prev.eligibility_reason
        : eligibleVal
        ? 'Activated Resident Account in Good Standing'
        : 'Account Not Yet Activated';

      const { error: upsertErr } = await supabaseAdmin
        .from('election_voters')
        .upsert(
          {
            election_id: id,
            resident_number: cleanNum,
            resident_id: r.id,
            eligible: eligibleVal,
            eligibility_reason: reasonVal
          },
          { onConflict: 'election_id,resident_number' }
        );

      if (!upsertErr) {
        syncedCount++;
        if (eligibleVal) activatedEligibleCount++;
      }
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'VOTER_REGISTER_SYNCED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Synchronized ${syncedCount} resident records (${activatedEligibleCount} activated eligible accounts).`
    });

    return res.json({
      success: true,
      message: `Synchronized ${syncedCount} resident records (${activatedEligibleCount} activated eligible accounts).`,
      count: syncedCount,
      eligibleCount: activatedEligibleCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error syncing voters.' });
  }
});

// PUT /api/election/admin/elections/:id/voters/:voterId/eligibility - Toggle voter eligibility in DB
electionRouter.put('/admin/elections/:id/voters/:voterId/eligibility', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, voterId } = req.params;
    const { eligible, reason } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: existingVoter } = await supabaseAdmin
      .from('election_voters')
      .select('*')
      .eq('id', voterId)
      .eq('election_id', id)
      .maybeSingle();

    if (!existingVoter) {
      return res.status(404).json({ success: false, message: 'Voter record not found.' });
    }

    if (existingVoter.has_voted && !eligible) {
      return res.status(400).json({
        success: false,
        message: `Cannot disqualify Plot #${existingVoter.resident_number} retroactively because their confidential ballot has already been cast and sealed.`
      });
    }

    // If marking eligible, check that the underlying resident account is activated
    if (eligible) {
      const resData = await serverDb.getResidentByNumber(existingVoter.resident_number);
      const accountEval = evaluateResidentAccountEligibility(resData, existingVoter.resident_number);
      if (!accountEval.eligible) {
        return res.status(400).json({
          success: false,
          code: accountEval.code,
          message: `Cannot accredit Plot #${existingVoter.resident_number}: ${accountEval.message}`
        });
      }
    }

    const { data: voter, error } = await supabaseAdmin
      .from('election_voters')
      .update({
        eligible: Boolean(eligible),
        eligibility_reason: reason || (eligible ? 'Accredited by Administrator' : 'Administrative Restriction')
      })
      .eq('id', voterId)
      .eq('election_id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: eligible ? 'VOTER_ACCREDITED' : 'VOTER_DISQUALIFIED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Voter Plot #${voter.resident_number} marked ${eligible ? 'ELIGIBLE' : 'INELIGIBLE'}. Reason: ${voter.eligibility_reason}`
    });

    return res.json({ success: true, voter });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error updating eligibility.' });
  }
});

// GET /api/election/admin/elections/:id/stats - Turnout & stats from Supabase
electionRouter.get('/admin/elections/:id/stats', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const sched = await evaluateAndSyncElectionSchedule(election);

    const { count: totalEligible } = await supabaseAdmin
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', id)
      .eq('eligible', true);

    const { count: totalVoted } = await supabaseAdmin
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', id)
      .eq('has_voted', true);

    const { count: totalBallots } = await supabaseAdmin
      .from('election_ballots')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', id);

    const eligible = totalEligible || 0;
    const voted = totalVoted || 0;
    const ballots = totalBallots ?? voted;
    const turnout = eligible > 0 ? Number(((ballots / eligible) * 100).toFixed(1)) : 0;

    const stats: ElectionStats = {
      total_eligible_voters: eligible,
      total_voters_authenticated: voted,
      total_ballots_cast: ballots,
      turnout_percentage: turnout,
      status: election.status as ElectionStatus,
      opening_at: election.starts_at,
      closing_at: election.ends_at,
      is_open: sched.isVotingOpen,
      has_closed: sched.isClosed
    };

    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving stats.' });
  }
});

// POST /api/election/admin/elections/:id/calculate-results - Tally anonymous ballots from Supabase (ONLY AFTER VOTING CLOSES)
electionRouter.post('/admin/elections/:id/calculate-results', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const sched = await evaluateAndSyncElectionSchedule(election);

    if (election.status !== 'CLOSED' && election.status !== 'RESULTS_PUBLISHED') {
      await supabaseAdmin.from('election_audit_logs').insert({
        election_id: id,
        action: 'PREMATURE_TALLY_BLOCKED',
        actor_type: 'ADMIN',
        actor_reference: adminUser.email,
        description: `Blocked premature candidate tally calculation while election status is ${election.status} (Voting closes: ${sched.votingClosesDisplay}).`
      });
      return res.status(403).json({
        success: false,
        code: 'TALLY_SEALED_UNTIL_CLOSE',
        message: `Candidate vote totals are sealed until voting officially closes (${sched.votingClosesDisplay}). Current election status is ${election.status}.`
      });
    }

    const snapshot = await computeAuthoritativeElectionTally(election, adminUser.full_name || adminUser.email);

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'RESULTS_CALCULATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Official results calculated for "${election.name}". Total accepted ballots: ${snapshot.total_voters} / ${snapshot.total_eligible_voters} (${snapshot.turnout_percentage}% turnout).`
    });

    return res.json({ success: true, results: snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error calculating results.' });
  }
});

// POST /api/election/admin/elections/:id/publish-results - Publish official results (Server-computed authoritative tally only)
electionRouter.post('/admin/elections/:id/publish-results', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const sched = await evaluateAndSyncElectionSchedule(election);

    if (election.status !== 'CLOSED' && election.status !== 'RESULTS_PUBLISHED') {
      await supabaseAdmin.from('election_audit_logs').insert({
        election_id: id,
        action: 'PREMATURE_PUBLICATION_BLOCKED',
        actor_type: 'ADMIN',
        actor_reference: adminUser.email,
        description: `Blocked attempt to publish results while election status is ${election.status}.`
      });
      return res.status(403).json({
        success: false,
        code: 'CANNOT_PUBLISH_BEFORE_CLOSE',
        message: `Official results cannot be published before voting closes (${sched.votingClosesDisplay}). Current status: ${election.status}.`
      });
    }

    // CRITICAL INTEGRITY ENFORCEMENT: Never trust vote totals supplied by the browser/client.
    // Always recompute the authoritative tally directly from the anonymous ballot ledger on the server.
    const authoritativeSnapshot = await computeAuthoritativeElectionTally(election, adminUser.full_name || adminUser.email);
    const now = new Date().toISOString();

    for (const pos of authoritativeSnapshot.positions) {
      for (const cand of pos.candidates) {
        await supabaseAdmin
          .from('election_results')
          .upsert(
            {
              election_id: id,
              position_id: pos.position_id,
              candidate_id: cand.candidate_id,
              vote_count: cand.votes,
              vote_percentage: cand.percentage,
              is_winner: Boolean(cand.is_winner),
              is_tie: Boolean(cand.is_tie),
              calculated_at: now,
              published_at: now
            },
            { onConflict: 'election_id,position_id,candidate_id' }
          );
      }
    }

    await supabaseAdmin
      .from('elections')
      .update({
        status: 'RESULTS_PUBLISHED',
        updated_at: now
      })
      .eq('id', id);

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'RESULTS_PUBLISHED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Official election results certified and published to public portal (${authoritativeSnapshot.total_voters} ballots, ${authoritativeSnapshot.turnout_percentage}% turnout).`
    });

    return res.json({
      success: true,
      message: 'Official results certified and published successfully.',
      results: authoritativeSnapshot
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error publishing results.' });
  }
});

// GET /api/election/admin/elections/:id/audit-logs - View audit trail from Supabase
electionRouter.get('/admin/elections/:id/audit-logs', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: logs, error } = await supabaseAdmin
      .from('election_audit_logs')
      .select('*')
      .eq('election_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const formattedLogs = (logs || []).map(l => ({
      ...l,
      actor_email: l.actor_reference || l.actor_email || l.actor_type || 'System'
    }));

    return res.json({ success: true, logs: formattedLogs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving audit logs.' });
  }
});

// ==========================================
// 5. ELECTION BY ID, RULES, AND CERTIFIED RESULTS
// ==========================================

// GET /api/election/:id - Get specific election by ID or code
// Public callers receive ONLY active positions and APPROVED candidates.
// Authorized administrators receive all positions and candidates for management.
electionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = await isRequestFromAuthorizedAdmin(req);

    const { data: electionData, error } = await supabaseAdmin
      .from('elections')
      .select('*')
      .or(`id.eq.${id},election_code.eq.${id}`)
      .maybeSingle();

    if (error || !electionData) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const sched = await evaluateAndSyncElectionSchedule(electionData);

    let posQuery = supabaseAdmin
      .from('election_positions')
      .select('*')
      .eq('election_id', electionData.id);

    if (!adminUser) {
      posQuery = posQuery.eq('is_active', true);
    }

    const { data: positions } = await posQuery.order('display_order', { ascending: true });

    let candQuery = supabaseAdmin
      .from('election_candidates')
      .select('*')
      .eq('election_id', electionData.id);

    if (!adminUser) {
      candQuery = candQuery.eq('status', 'APPROVED');
    }

    const { data: candidates } = await candQuery.order('display_order', { ascending: true });

    const electionResponse: Election = {
      id: electionData.id,
      title: electionData.name,
      year: new Date(electionData.starts_at).getFullYear() || 2026,
      description: electionData.description,
      status: electionData.status as ElectionStatus,
      calculated_status: sched.calculatedStatus,
      status_label: sched.statusLabel,
      is_voting_open: sched.isVotingOpen,
      is_scheduled: sched.isScheduled,
      is_closed: sched.isClosed,
      opening_at: electionData.starts_at,
      closing_at: electionData.ends_at,
      voting_opens_display: sched.votingOpensDisplay,
      voting_closes_display: sched.votingClosesDisplay,
      server_time: sched.serverTimeIso,
      election_rules: electionData.constitution_rules || '',
      tie_resolution_rule: electionData.tie_breaking_rule || '',
      created_at: electionData.created_at,
      updated_at: electionData.updated_at
    };

    return res.json({
      success: true,
      election: electionResponse,
      positions: (positions || []).map(p => ({
        id: p.id,
        election_id: p.election_id,
        title: p.name,
        description: p.description || '',
        display_order: p.display_order,
        active: p.is_active,
        max_selections: p.max_selections || 1,
        created_at: p.created_at,
        updated_at: p.updated_at
      })),
      candidates: (candidates || []).map(c => ({
        id: c.id,
        election_id: c.election_id,
        position_id: c.position_id,
        full_name: c.full_name,
        photograph_url: c.photo_url || '',
        biography: c.profile || '',
        candidate_statement: c.manifesto || '',
        display_order: c.display_order,
        status: c.status as CandidateStatus,
        created_at: c.created_at,
        updated_at: c.updated_at
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving election.' });
  }
});

// GET /api/election/:id/rules - Get election constitutional rules
electionRouter.get('/:id/rules', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('elections')
      .select('constitution_rules, tie_breaking_rule')
      .or(`id.eq.${id},election_code.eq.${id}`)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Election rules not found.' });
    }

    return res.json({
      success: true,
      rules: data.constitution_rules,
      tie_resolution_rule: data.tie_breaking_rule
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error fetching rules.' });
  }
});

// GET /api/election/:id/results - CRITICAL: Never expose results until officially certified & published
electionRouter.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: election, error: elecError } = await supabaseAdmin
      .from('elections')
      .select('*')
      .or(`id.eq.${id},election_code.eq.${id}`)
      .maybeSingle();

    if (elecError || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    await evaluateAndSyncElectionSchedule(election);

    if (election.status !== 'RESULTS_PUBLISHED') {
      return res.status(403).json({
        success: false,
        status: election.status,
        message: 'Official results are sealed until voting concludes and the Electoral Committee certifies publication.'
      });
    }

    const { data: resultsRows, error: resError } = await supabaseAdmin
      .from('election_results')
      .select(`
        id,
        election_id,
        position_id,
        candidate_id,
        vote_count,
        vote_percentage,
        is_winner,
        is_tie,
        published_at,
        election_positions:position_id (name, display_order),
        election_candidates:candidate_id (full_name, photo_url)
      `)
      .eq('election_id', election.id);

    if (resError) {
      return res.status(500).json({ success: false, message: 'Error fetching certified results.' });
    }

    const positionsMap = new Map<string, PositionResult>();

    for (const r of (resultsRows || [])) {
      const posName = (r.election_positions as any)?.name || 'Position';
      const candName = (r.election_candidates as any)?.full_name || 'Candidate';
      const candPhoto = (r.election_candidates as any)?.photo_url || '';

      if (!positionsMap.has(r.position_id)) {
        positionsMap.set(r.position_id, {
          position_id: r.position_id,
          position_title: posName,
          total_votes: 0,
          is_tie: false,
          candidates: []
        });
      }

      const posRes = positionsMap.get(r.position_id)!;
      posRes.total_votes += r.vote_count;
      if (r.is_tie) {
        posRes.is_tie = true;
        posRes.tie_message = `Tie detected in ${posName}. Constitutional tie-resolution mandate applies.`;
      }

      posRes.candidates.push({
        candidate_id: r.candidate_id,
        full_name: candName,
        photograph_url: candPhoto,
        votes: r.vote_count,
        percentage: Number(r.vote_percentage),
        is_winner: r.is_winner,
        is_tie: r.is_tie
      });
    }

    // Sort candidates inside each position by vote count descending
    for (const posRes of positionsMap.values()) {
      posRes.candidates.sort((a, b) => b.votes - a.votes);
    }

    const { count: totalEligible } = await supabaseAdmin
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election.id)
      .eq('eligible', true);

    const { count: totalBallots } = await supabaseAdmin
      .from('election_ballots')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election.id);

    const votersCount = totalEligible || 0;
    const ballotsCount = totalBallots || 0;
    const turnout = votersCount > 0 ? Number(((ballotsCount / votersCount) * 100).toFixed(1)) : 0;

    const snapshot: ElectionResultSnapshot = {
      election_id: election.id,
      election_title: election.name,
      year: new Date(election.starts_at).getFullYear() || 2026,
      total_eligible_voters: votersCount,
      total_voters: ballotsCount,
      turnout_percentage: turnout,
      opening_at: election.starts_at,
      closing_at: election.ends_at,
      published_at: resultsRows?.[0]?.published_at || election.updated_at,
      published_by: 'Electoral Committee',
      tie_resolution_rule: election.tie_breaking_rule || '',
      positions: Array.from(positionsMap.values())
    };

    return res.json({ success: true, status: 'RESULTS_PUBLISHED', results: snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error compiling election results.' });
  }
});
