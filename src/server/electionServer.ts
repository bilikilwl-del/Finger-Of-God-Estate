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

// ==========================================
// 1. PUBLIC ELECTION ENDPOINTS
// ==========================================

// Helper to format timestamps in WAT (West Africa Time, UTC+1)
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

    // 2. Compute dynamic election status based on server & database time
    const serverNow = new Date();
    const serverTimeIso = serverNow.toISOString();
    const startsAt = new Date(electionData.starts_at);
    const endsAt = new Date(electionData.ends_at);

    let calculatedStatus: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'PAUSED';
    let statusLabel: string;
    let isVotingOpen: boolean = false;
    let isScheduled: boolean = false;
    let isClosed: boolean = false;

    if (electionData.status === 'RESULTS_PUBLISHED') {
      calculatedStatus = 'RESULTS_PUBLISHED';
      statusLabel = 'Status: Official Results Certified';
      isClosed = true;
      isVotingOpen = false;
    } else if (electionData.status === 'PAUSED') {
      calculatedStatus = 'PAUSED';
      statusLabel = 'Status: Voting Paused';
      isVotingOpen = false;
    } else if (serverNow < startsAt) {
      // Future scheduled election:
      calculatedStatus = 'SCHEDULED';
      statusLabel = 'Status: Scheduled — Voting Not Yet Open';
      isScheduled = true;
      isVotingOpen = false;
    } else if (serverNow >= startsAt && serverNow < endsAt) {
      // Current time has reached opening date/time:
      calculatedStatus = 'OPEN';
      statusLabel = 'Status: Voting Open';
      isVotingOpen = true;
      // Auto-sync database status to OPEN if it was DRAFT or UPCOMING
      if (['DRAFT', 'UPCOMING'].includes(electionData.status)) {
        await supabaseAdmin.from('elections').update({ status: 'OPEN', updated_at: serverTimeIso }).eq('id', electionData.id);
        electionData.status = 'OPEN';
      }
    } else {
      // Current time has reached or passed closing date/time:
      calculatedStatus = 'CLOSED';
      statusLabel = 'Status: Voting Closed';
      isClosed = true;
      isVotingOpen = false;
      // Auto-sync database status to CLOSED if it was OPEN
      if (electionData.status === 'OPEN') {
        await supabaseAdmin.from('elections').update({ status: 'CLOSED', updated_at: serverTimeIso }).eq('id', electionData.id);
        electionData.status = 'CLOSED';
      }
    }

    const votingOpensDisplay = formatElectionWat(startsAt);
    const votingClosesDisplay = formatElectionWat(endsAt);

    // 3. Fetch active positions
    const { data: positionsData, error: posError } = await supabaseAdmin
      .from('election_positions')
      .select('*')
      .eq('election_id', electionData.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (posError) {
      return res.status(500).json({ success: false, message: 'Error retrieving election positions.' });
    }

    // 4. Fetch candidates (approved candidates for ballot, or all registered candidates if in preparation)
    const candidateQuery = supabaseAdmin
      .from('election_candidates')
      .select('*')
      .eq('election_id', electionData.id);

    if (calculatedStatus === 'OPEN' || calculatedStatus === 'CLOSED' || calculatedStatus === 'RESULTS_PUBLISHED') {
      candidateQuery.eq('status', 'APPROVED');
    }

    const { data: candidatesData, error: candError } = await candidateQuery.order('display_order', { ascending: true });

    if (candError) {
      return res.status(500).json({ success: false, message: 'Error retrieving candidates.' });
    }

    const electionResponse: Election = {
      id: electionData.id,
      title: electionData.name,
      year: new Date(electionData.starts_at).getFullYear() || 2026,
      description: electionData.description,
      status: (calculatedStatus === 'SCHEDULED' ? 'UPCOMING' : calculatedStatus) as ElectionStatus,
      calculated_status: calculatedStatus,
      status_label: statusLabel,
      is_voting_open: isVotingOpen,
      is_scheduled: isScheduled,
      is_closed: isClosed,
      opening_at: electionData.starts_at,
      closing_at: electionData.ends_at,
      voting_opens_display: votingOpensDisplay,
      voting_closes_display: votingClosesDisplay,
      server_time: serverTimeIso,
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

// GET /api/election/:id - Get specific election by ID or code
electionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: electionData, error } = await supabaseAdmin
      .from('elections')
      .select('*')
      .or(`id.eq.${id},election_code.eq.${id}`)
      .maybeSingle();

    if (error || !electionData) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const { data: positions } = await supabaseAdmin
      .from('election_positions')
      .select('*')
      .eq('election_id', electionData.id)
      .order('display_order', { ascending: true });

    const { data: candidates } = await supabaseAdmin
      .from('election_candidates')
      .select('*')
      .eq('election_id', electionData.id)
      .order('display_order', { ascending: true });

    const electionResponse: Election = {
      id: electionData.id,
      title: electionData.name,
      year: new Date(electionData.starts_at).getFullYear() || 2026,
      description: electionData.description,
      status: electionData.status as ElectionStatus,
      opening_at: electionData.starts_at,
      closing_at: electionData.ends_at,
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

// GET /api/election/:id/results - CRITICAL: Never expose results while voting is OPEN
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

    if (election.status !== 'RESULTS_PUBLISHED') {
      return res.status(403).json({
        success: false,
        status: election.status,
        message: 'Official results are sealed until voting concludes and the Electoral Committee certifies publication.'
      });
    }

    // Fetch certified results
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

    // Aggregate by position
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

    // Fetch turnout counts
    const { count: totalEligible } = await supabaseAdmin
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election.id)
      .eq('eligible', true);

    const { count: totalBallots } = await supabaseAdmin
      .from('election_ballots')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election.id);

    const votersCount = totalEligible || 1;
    const ballotsCount = totalBallots || 0;
    const turnout = Number(((ballotsCount / votersCount) * 100).toFixed(1));

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

// ==========================================
// 2. RESIDENT VOTER AUTHENTICATION & OTP
// ==========================================

// Rate limit map: residentNumber -> [timestamps]
const otpRequestRateLimits = new Map<string, number[]>();

// POST /api/election/auth/initiate - Enter Estate/Resident Number & receive OTP
electionRouter.post('/auth/initiate', async (req: Request, res: Response) => {
  try {
    const { residentNumber, electionId } = req.body;
    const rawNum = String(residentNumber || '').trim();

    // Strict 3-digit format validation (e.g. 001, 291). Non-digit or wrong length must be rejected.
    if (!/^\d{3}$/.test(rawNum)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 3-digit Estate Number between 001 and 300 (e.g. 001).'
      });
    }

    const numInt = parseInt(rawNum, 10);
    if (numInt < 1 || numInt > 300) {
      return res.status(400).json({
        success: false,
        message: 'Estate Number must be between 001 and 300.'
      });
    }

    const cleanNum = rawNum;

    // Find election
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
        message: 'No active election is currently open for voting.'
      });
    }

    if (election.status !== 'OPEN') {
      return res.status(403).json({
        success: false,
        message: `Voting is not open. Current election status: ${election.status}.`
      });
    }

    if (election.ends_at && new Date() > new Date(election.ends_at)) {
      return res.status(403).json({
        success: false,
        message: 'Voting period for this election has ended.'
      });
    }

    // Rate Limiting: Max 3 OTP requests in 10 minutes, with 60s cooldown
    const now = Date.now();
    const timestamps = otpRequestRateLimits.get(cleanNum) || [];
    const recent = timestamps.filter(t => now - t < 10 * 60 * 1000);

    if (recent.length >= 4) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 10 minutes before trying again.'
      });
    }

    if (recent.length > 0 && now - recent[recent.length - 1] < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - recent[recent.length - 1])) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting a new code.`
      });
    }

    recent.push(now);
    otpRequestRateLimits.set(cleanNum, recent);

    // Look up resident phone from serverDb (which checks Supabase residents table with localDb fallback)
    const resData = await serverDb.getResidentByNumber(cleanNum);

    if (!resData || !resData.phone_number) {
      return res.status(404).json({
        success: false,
        message: `Estate Number #${cleanNum} is not currently registered in the estate resident database. Please contact the Secretariat.`
      });
    }

    const residentPhone = resData.phone_number;

    // Verify or register voter record in election_voters
    let { data: voter, error: voterErr } = await supabaseAdmin
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
          eligibility_reason: 'Registered Landlord in Good Standing',
          has_voted: false
        })
        .select()
        .single();

      if (insertVoterErr || !newVoter) {
        return res.status(500).json({ success: false, message: 'Error accrediting property for election.' });
      }
      voter = newVoter;
    }

    if (!voter.eligible) {
      return res.status(403).json({
        success: false,
        message: `Estate Number #${cleanNum} is marked ineligible for this election: ${voter.eligibility_reason || 'Administrative restriction'}.`
      });
    }

    if (voter.has_voted) {
      return res.status(403).json({
        success: false,
        message: `Estate Number #${cleanNum} has already cast a ballot in this election on ${new Date(voter.voted_at || now).toLocaleString()}. Under the Estate Constitution, each accredited property may vote only once.`
      });
    }

    // Generate Cryptographically Secure 6-digit OTP
    const otpInt = crypto.randomInt(100000, 999999);
    const otpCode = String(otpInt);

    // Cryptographic salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const otp_hash = sha256(salt + otpCode);
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = sha256(rawSessionToken);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store in Supabase election_voting_sessions
    const { error: sessionInsertErr } = await supabaseAdmin
      .from('election_voting_sessions')
      .insert({
        election_id: election.id,
        voter_id: voter.id,
        session_token_hash: sessionTokenHash,
        otp_hash,
        otp_salt: salt,
        otp_attempts: 0,
        otp_expires_at: expiresAt,
        expires_at: expiresAt,
        consumed: false
      });

    if (sessionInsertErr) {
      console.error('Error creating voting session in DB:', sessionInsertErr);
      return res.status(500).json({ success: false, message: 'Could not create secure voting session.' });
    }

    return res.json({
      success: true,
      message: `Verification code sent to registered contact for Estate #${cleanNum}.`,
      sessionToken: rawSessionToken,
      maskedPhone: maskPhone(residentPhone),
      expiresAt
    });
  } catch (err: any) {
    console.error('Error initiating voter verification:', err);
    return res.status(500).json({ success: false, message: 'Server error initiating verification.' });
  }
});

// POST /api/election/auth/verify-otp - Verify code & unlock ballot
electionRouter.post('/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { sessionToken, otpCode } = req.body;
    if (!sessionToken || !otpCode) {
      return res.status(400).json({ success: false, message: 'Session token and 6-digit code are required.' });
    }

    const sessionTokenHash = sha256(String(sessionToken).trim());

    const { data: session, error: sessErr } = await supabaseAdmin
      .from('election_voting_sessions')
      .select('*, election_voters:voter_id(resident_number, eligible, has_voted)')
      .eq('session_token_hash', sessionTokenHash)
      .maybeSingle();

    if (sessErr || !session) {
      return res.status(404).json({ success: false, message: 'Voting session expired or not found. Please request a new code.' });
    }

    if (session.consumed) {
      return res.status(403).json({ success: false, message: 'This voting session has already been used to cast a ballot.' });
    }

    if (new Date() > new Date(session.expires_at)) {
      return res.status(403).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
    }

    if (session.otp_attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    // Verify hash
    const inputHash = sha256(session.otp_salt + String(otpCode).trim());
    if (inputHash !== session.otp_hash) {
      const newAttempts = session.otp_attempts + 1;
      await supabaseAdmin
        .from('election_voting_sessions')
        .update({ otp_attempts: newAttempts, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      const remaining = 5 - newAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`
      });
    }

    return res.json({
      success: true,
      message: 'Voter authenticated successfully. Ballot unlocked.',
      voter: {
        resident_number: (session.election_voters as any)?.resident_number,
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
  try {
    const { sessionToken, electionId, selections } = req.body;

    if (!sessionToken || !electionId || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid ballot submission payload.' });
    }

    const sessionTokenHash = sha256(String(sessionToken).trim());
    const confirmationCode = generateConfirmationCode(2026);

    // Call PostgreSQL stored procedure cast_ballot()
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('cast_ballot', {
      p_election_id: electionId,
      p_session_token_hash: sessionTokenHash,
      p_ballot_reference: confirmationCode,
      p_choices: selections.map((s: any) => ({
        position_id: s.positionId,
        candidate_id: s.candidateId
      }))
    });

    if (rpcError) {
      console.error('RPC cast_ballot execution error:', rpcError);
      return res.status(500).json({
        success: false,
        message: rpcError.message || 'Database transaction error processing ballot.'
      });
    }

    if (!rpcResult || !rpcResult.success) {
      return res.status(400).json({
        success: false,
        message: rpcResult?.message || 'Ballot could not be recorded.'
      });
    }

    return res.json({
      success: true,
      message: rpcResult.message,
      confirmationCode: rpcResult.confirmation_code,
      submittedAt: rpcResult.submitted_at
    });
  } catch (err: any) {
    console.error('Error submitting ballot:', err);
    return res.status(500).json({ success: false, message: 'Server error processing ballot.' });
  }
});

// ==========================================
// 4. ADMIN ELECTION MANAGEMENT
// ==========================================

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

      const eligible = voterCount || 0;
      const cast = votedCount || 0;
      const turnout = eligible > 0 ? Number(((cast / eligible) * 100).toFixed(1)) : 0;

      return {
        id: e.id,
        title: e.name,
        year: new Date(e.starts_at).getFullYear() || 2026,
        description: e.description,
        status: e.status,
        opening_at: e.starts_at,
        closing_at: e.ends_at,
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

    if (!title) {
      return res.status(400).json({ success: false, message: 'Election title is required.' });
    }

    const electionCode = `FOG-ELEC-${year || 2026}-${Date.now().toString(36).toUpperCase()}`;

    const { data: newElection, error } = await supabaseAdmin
      .from('elections')
      .insert({
        election_code: electionCode,
        name: String(title).trim(),
        description: String(description || '').trim(),
        status: 'DRAFT',
        starts_at: opening_at || new Date().toISOString(),
        ends_at: closing_at || new Date(Date.now() + 14 * 86400000).toISOString(),
        constitution_rules: election_rules || '1. One vote per accredited resident 001–300.\n2. Secret ballot.',
        tie_breaking_rule: tie_resolution_rule || 'Run-off election within 7 days in accordance with Article 8.',
        created_by: adminUser.email
      })
      .select()
      .single();

    if (error || !newElection) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to create election.' });
    }

    // Audit log
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
        created_at: newElection.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error creating election.' });
  }
});

// PUT /api/election/admin/elections/:id - Update election metadata
electionRouter.put('/admin/elections/:id', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, opening_at, closing_at, election_rules, tie_resolution_rule } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    const { data: existing, error: findErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (existing.status === 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify configuration while voting is OPEN. Please pause or close election first.'
      });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (title) updates.name = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (opening_at) updates.starts_at = opening_at;
    if (closing_at) updates.ends_at = closing_at;
    if (election_rules) updates.constitution_rules = election_rules;
    if (tie_resolution_rule) updates.tie_breaking_rule = tie_resolution_rule;

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
      action: 'ELECTION_UPDATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Election configuration updated for "${updated.name}"`
    });

    return res.json({ success: true, election: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error updating election.' });
  }
});

// POST /api/election/admin/elections/:id/status - Change status in Supabase
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

    const { error: updateErr } = await supabaseAdmin
      .from('elections')
      .update({ status, updated_at: new Date().toISOString() })
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

    if (!title) {
      return res.status(400).json({ success: false, message: 'Position title is required.' });
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

    return res.json({ success: true, position: newPos });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error adding position.' });
  }
});

// PUT /api/election/admin/elections/:id/positions/:positionId - Update position before election opens
electionRouter.put('/admin/elections/:id/positions/:positionId', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id, positionId } = req.params;
    const { title, description, display_order, max_selections, is_active } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    // Check election status - cannot edit positions if election is OPEN or RESULTS_PUBLISHED
    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('status, name')
      .eq('id', id)
      .single();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (election.status === 'OPEN' || election.status === 'RESULTS_PUBLISHED') {
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

    // Audit log
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

    // Verify election status allows candidate registration (DRAFT or UPCOMING)
    const { data: election, error: elecErr } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (elecErr || !election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    if (['OPEN', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot register new candidates while election is in ${election.status} status.`
      });
    }

    // Verify that the position belongs to this election
    const { data: positionRecord, error: posErr } = await supabaseAdmin
      .from('election_positions')
      .select('id, name')
      .eq('id', position_id)
      .eq('election_id', id)
      .maybeSingle();

    if (posErr || !positionRecord) {
      return res.status(400).json({ success: false, message: 'Selected position is not part of this election.' });
    }

    // Check for duplicate candidate name in the same position
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

    // Insert candidate with initial status PENDING
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

    // Audit trail
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

    // Verify election status permits status update
    const { data: election } = await supabaseAdmin
      .from('elections')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (election && ['CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update candidate status while election is ${election.status}.`
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

    // Audit log
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

    if (election && ['OPEN', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
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

    // Audit log
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

    if (election && ['OPEN', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
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

    // Audit log
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

// GET /api/election/admin/elections/:id/voters - List accredited voters
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
        residents:resident_id (full_name, phone_number, house_number)
      `)
      .eq('election_id', id)
      .order('resident_number', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const formatted = (voters || []).map(v => ({
      id: v.id,
      election_id: v.election_id,
      resident_id: v.resident_id,
      resident_number: v.resident_number,
      full_name: (v.residents as any)?.full_name || `Estate Plot #${v.resident_number}`,
      phone_number: (v.residents as any)?.phone_number || '',
      house_number: (v.residents as any)?.house_number || '',
      eligible: v.eligible,
      eligibility_reason: v.eligibility_reason,
      has_voted: v.has_voted,
      ballot_submitted_at: v.voted_at,
      created_at: v.created_at,
      updated_at: v.created_at
    }));

    return res.json({ success: true, voters: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error fetching voters.' });
  }
});

// POST /api/election/admin/elections/:id/voters/sync - Sync resident register (001 - 300) into Supabase
electionRouter.post('/admin/elections/:id/voters/sync', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch active residents from serverDb (which checks Supabase residents table with localDb fallback)
    const allResidents = await serverDb.getResidents();
    const residents = (allResidents || []).filter((r: any) => r.status === 'Active');

    let syncedCount = 0;

    for (const r of (residents || [])) {
      const { error: upsertErr } = await supabaseAdmin
        .from('election_voters')
        .upsert(
          {
            election_id: id,
            resident_number: r.resident_number,
            resident_id: r.id,
            eligible: true,
            eligibility_reason: 'Active Registered Resident'
          },
          { onConflict: 'election_id,resident_number' }
        );

      if (!upsertErr) syncedCount++;
    }

    return res.json({
      success: true,
      message: `Synchronized ${syncedCount} accredited properties into voter register.`,
      count: syncedCount
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

    const { data: voter, error } = await supabaseAdmin
      .from('election_voters')
      .update({
        eligible: Boolean(eligible),
        eligibility_reason: reason || (eligible ? 'Accredited by Administrator' : 'Administrative Restriction'),
        updated_at: new Date().toISOString()
      })
      .eq('id', voterId)
      .eq('election_id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

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
    const turnout = eligible > 0 ? Number(((voted / eligible) * 100).toFixed(1)) : 0;

    const stats: ElectionStats = {
      total_eligible_voters: eligible,
      total_voters_authenticated: voted,
      total_ballots_cast: totalBallots || voted,
      turnout_percentage: turnout,
      status: election.status as ElectionStatus,
      opening_at: election.starts_at,
      closing_at: election.ends_at,
      is_open: election.status === 'OPEN',
      has_closed: election.status === 'CLOSED' || election.status === 'RESULTS_PUBLISHED'
    };

    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving stats.' });
  }
});

// POST /api/election/admin/elections/:id/calculate-results - Tally anonymous ballots from Supabase
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
      .eq('status', 'APPROVED');

    // Fetch anonymous ballot choices
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
      return res.status(500).json({ success: false, message: choicesErr.message });
    }

    // Tally by position
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
        tie_message = `TIE DETECTED: Equal vote count (${sortedCandidates[0].votes}) between ${sortedCandidates[0].full_name} and ${sortedCandidates[1].full_name}. Constitutional Article 8 mandate applies.`;
        sortedCandidates[0].is_tie = true;
        sortedCandidates[1].is_tie = true;
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

    // Total turnout
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

    const snapshot: ElectionResultSnapshot = {
      election_id: election.id,
      election_title: election.name,
      year: new Date(election.starts_at).getFullYear() || 2026,
      total_eligible_voters: eligible,
      total_voters: ballots,
      turnout_percentage: turnout,
      opening_at: election.starts_at,
      closing_at: election.ends_at,
      published_at: new Date().toISOString(),
      published_by: adminUser.full_name || adminUser.email,
      tie_resolution_rule: election.tie_breaking_rule || '',
      positions: positionResults
    };

    await supabaseAdmin.from('election_audit_logs').insert({
      election_id: id,
      action: 'RESULTS_CALCULATED',
      actor_type: 'ADMIN',
      actor_reference: adminUser.email,
      description: `Official results calculated for "${election.name}". Total ballots: ${ballots}.`
    });

    return res.json({ success: true, results: snapshot });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server error calculating results.' });
  }
});

// POST /api/election/admin/elections/:id/publish-results - Publish official results to Supabase table
electionRouter.post('/admin/elections/:id/publish-results', requireElectionAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { results } = req.body;
    const adminUser = (req as any).adminUser as VerifiedAdminUser;

    if (!results || !Array.isArray(results.positions)) {
      return res.status(400).json({ success: false, message: 'Valid results snapshot payload is required.' });
    }

    const now = new Date().toISOString();

    // Insert or update election_results records
    for (const pos of results.positions) {
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

    // Update election status
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
      description: `Official election results certified and published to public portal.`
    });

    return res.json({ success: true, message: 'Official results published successfully.' });
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

    return res.json({ success: true, logs: logs || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error retrieving audit logs.' });
  }
});
