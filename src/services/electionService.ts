import { supabase } from '../lib/supabase';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionVoter, 
  ElectionStats, 
  ElectionResultSnapshot, 
  ElectionAuditLog,
  ElectionStatus
} from '../types/election';

async function getAdminAuthHeader(explicitToken?: string): Promise<Record<string, string>> {
  if (explicitToken) {
    return { Authorization: `Bearer ${explicitToken}` };
  }
  try {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase session token:', err);
  }
  return {};
}

export const electionService = {
  // ==========================================
  // PUBLIC VOTER & ELECTION CALLS
  // ==========================================

  async getActiveElection(): Promise<{ 
    success: boolean; 
    election?: Election; 
    positions?: ElectionPosition[]; 
    candidates?: ElectionCandidate[];
    message?: string;
  }> {
    try {
      const res = await fetch('/api/election/active', {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Error fetching active election:', err);
      return { success: false, message: 'Could not load active election details.' };
    }
  },

  async getElectionById(id: string): Promise<{
    success: boolean;
    election?: Election;
    positions?: ElectionPosition[];
    candidates?: ElectionCandidate[];
    message?: string;
  }> {
    try {
      const res = await fetch(`/api/election/${id}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Error fetching election.' };
    }
  },

  async getElectionRules(id: string): Promise<{
    success: boolean;
    rules?: string;
    tie_resolution_rule?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`/api/election/${id}/rules`);
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Error fetching rules.' };
    }
  },

  async getElectionResults(id: string): Promise<{
    success: boolean;
    status?: ElectionStatus;
    results?: ElectionResultSnapshot;
    message?: string;
  }> {
    try {
      const res = await fetch(`/api/election/${id}/results`);
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Error fetching results.' };
    }
  },

  // Step 1: Initiate Voter OTP Authentication
  async initiateVoterAuth(residentNumber: string, electionId?: string): Promise<{
    success: boolean;
    message: string;
    sessionToken?: string;
    maskedPhone?: string;
    expiresAt?: string;
  }> {
    try {
      const res = await fetch('/api/election/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentNumber, electionId })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to request verification code.' };
    }
  },

  // Step 2: Verify 6-digit OTP
  async verifyVoterOtp(sessionToken: string, otpCode: string): Promise<{
    success: boolean;
    message: string;
    voter?: { resident_number: string; eligible: boolean };
  }> {
    try {
      const res = await fetch('/api/election/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, otpCode })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to verify OTP.' };
    }
  },

  // Step 3: Confidential Secret Ballot Submission
  async submitBallot(payload: {
    sessionToken: string;
    electionId: string;
    selections: { positionId: string; candidateId: string }[];
  }): Promise<{
    success: boolean;
    message: string;
    confirmationCode?: string;
    submittedAt?: string;
  }> {
    try {
      const res = await fetch('/api/election/ballot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to cast ballot.' };
    }
  },

  // ==========================================
  // ADMIN PRIVILEGED OPERATIONS
  // ==========================================

  async getAdminElections(token?: string): Promise<{
    success: boolean;
    elections?: any[];
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch('/api/election/admin/elections', { headers });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch elections.' };
    }
  },

  async createAdminElection(payload: Partial<Election>, token?: string): Promise<{
    success: boolean;
    election?: Election;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch('/api/election/admin/elections', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to create election.' };
    }
  },

  async updateAdminElection(id: string, payload: Partial<Election>, token?: string): Promise<{
    success: boolean;
    election?: Election;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update election.' };
    }
  },

  async updateElectionStatus(id: string, status: ElectionStatus, reason?: string, token?: string): Promise<{
    success: boolean;
    election?: Election;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/status`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update status.' };
    }
  },

  async addPosition(id: string, position: Partial<ElectionPosition>, token?: string): Promise<{
    success: boolean;
    position?: ElectionPosition;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/positions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(position)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to add position.' };
    }
  },

  async updatePosition(id: string, positionId: string, position: Partial<ElectionPosition>, token?: string): Promise<{
    success: boolean;
    position?: ElectionPosition;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/positions/${positionId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(position)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update position.' };
    }
  },

  async addCandidate(id: string, candidate: Partial<ElectionCandidate>, token?: string): Promise<{
    success: boolean;
    candidate?: ElectionCandidate;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/candidates`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to add candidate.' };
    }
  },

  async updateCandidate(id: string, candidateId: string, candidate: Partial<ElectionCandidate>, token?: string): Promise<{
    success: boolean;
    candidate?: ElectionCandidate;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update candidate.' };
    }
  },

  async updateCandidateStatus(id: string, candidateId: string, status: string, token?: string): Promise<{
    success: boolean;
    candidate?: ElectionCandidate;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update candidate status.' };
    }
  },

  async deleteCandidate(id: string, candidateId: string, token?: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/candidates/${candidateId}`, {
        method: 'DELETE',
        headers
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete candidate.' };
    }
  },

  async getVoters(id: string, token?: string): Promise<{
    success: boolean;
    voters?: ElectionVoter[];
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/voters`, { headers });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch voters.' };
    }
  },

  async syncVoters(id: string, token?: string): Promise<{
    success: boolean;
    count?: number;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/voters/sync`, {
        method: 'POST',
        headers
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to sync voters.' };
    }
  },

  async updateVoterEligibility(id: string, voterId: string, eligible: boolean, reason?: string, token?: string): Promise<{
    success: boolean;
    voter?: ElectionVoter;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/voters/${voterId}/eligibility`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eligible, reason })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update eligibility.' };
    }
  },

  async getElectionStats(id: string, token?: string): Promise<{
    success: boolean;
    stats?: ElectionStats;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/stats`, { headers });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch stats.' };
    }
  },

  async calculateResults(id: string, token?: string): Promise<{
    success: boolean;
    results?: ElectionResultSnapshot;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/calculate-results`, {
        method: 'POST',
        headers
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to calculate results.' };
    }
  },

  async publishResults(id: string, results: ElectionResultSnapshot, token?: string): Promise<{
    success: boolean;
    election?: Election;
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/publish-results`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to publish results.' };
    }
  },

  async getAuditLogs(id: string, token?: string): Promise<{
    success: boolean;
    logs?: ElectionAuditLog[];
    message?: string;
  }> {
    try {
      const headers = await getAdminAuthHeader(token);
      const res = await fetch(`/api/election/admin/elections/${id}/audit-logs`, { headers });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to fetch audit logs.' };
    }
  }
};
