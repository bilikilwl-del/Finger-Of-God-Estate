export type ElectionStatus = 
  | 'DRAFT' 
  | 'UPCOMING' 
  | 'OPEN' 
  | 'PAUSED' 
  | 'CLOSED' 
  | 'RESULTS_PUBLISHED';

export type CandidateStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'WITHDRAWN';

export interface Election {
  id: string;
  title: string;
  year: number;
  description: string;
  status: ElectionStatus;
  calculated_status?: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'PAUSED';
  status_label?: string;
  is_voting_open?: boolean;
  is_scheduled?: boolean;
  is_closed?: boolean;
  voting_opens_display?: string;
  voting_closes_display?: string;
  server_time?: string;
  opening_at: string;
  closing_at: string;
  election_rules: string;
  tie_resolution_rule: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  positions?: ElectionPosition[];
  stats?: ElectionStats;
}

export interface ElectionPosition {
  id: string;
  election_id: string;
  title: string;
  description: string;
  display_order: number;
  active: boolean;
  max_selections: number;
  created_at: string;
  updated_at: string;
  candidates?: ElectionCandidate[];
}

export interface ElectionCandidate {
  id: string;
  election_id: string;
  position_id: string;
  full_name: string;
  photograph_url?: string;
  biography: string;
  candidate_statement: string;
  display_order: number;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
}

export interface ElectionVoter {
  id: string;
  election_id: string;
  resident_id: string;
  resident_number: string;
  full_name?: string;
  phone_number?: string;
  house_number?: string;
  eligible: boolean;
  eligibility_reason: string;
  authenticated_at?: string | null;
  ballot_submitted_at?: string | null;
  has_voted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElectionBallotChoice {
  position_id: string;
  candidate_id: string;
}

export interface CandidateResult {
  candidate_id: string;
  full_name: string;
  photograph_url?: string;
  votes: number;
  percentage: number;
  is_winner?: boolean;
  is_tie?: boolean;
}

export interface PositionResult {
  position_id: string;
  position_title: string;
  total_votes: number;
  is_tie: boolean;
  tie_message?: string;
  candidates: CandidateResult[];
}

export interface ElectionResultSnapshot {
  election_id: string;
  election_title: string;
  year: number;
  total_eligible_voters: number;
  total_voters: number;
  turnout_percentage: number;
  opening_at: string;
  closing_at: string;
  published_at: string;
  published_by: string;
  tie_resolution_rule: string;
  positions: PositionResult[];
}

export interface ElectionStats {
  total_eligible_voters: number;
  total_voters_authenticated: number;
  total_ballots_cast: number;
  turnout_percentage: number;
  status: ElectionStatus;
  opening_at: string;
  closing_at: string;
  is_open: boolean;
  has_closed: boolean;
}

export interface ElectionAuditLog {
  id: string;
  election_id: string;
  action: string;
  actor_email: string;
  record_id?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}
