import { http } from '@api/http';
import type { MyTeam, TeamJoinRequest, TeamPublic, TeamWithLandmark, TeamMemberInfo } from './types';

export const teamApi = {
  async list(): Promise<TeamWithLandmark[]> {
    return http('/teams');
  },

  async listMy(): Promise<MyTeam[]> {
    return http('/teams/my');
  },

  async listAll(): Promise<TeamPublic[]> {
    return http('/teams/all');
  },

  async listMyJoinRequests(): Promise<TeamJoinRequest[]> {
    return http('/teams/my-requests');
  },

  async getById(teamId: string): Promise<MyTeam> {
    return http(`/teams/${teamId}`);
  },

  async requestJoin(teamId: string): Promise<TeamJoinRequest> {
    return http(`/teams/${teamId}/join`, { method: 'POST' });
  },

  async cancelJoin(teamId: string): Promise<void> {
    return http(`/teams/${teamId}/join`, { method: 'DELETE' });
  },

  async listTeamRequests(teamId: string): Promise<TeamJoinRequest[]> {
    return http(`/teams/${teamId}/join-requests`);
  },

  async approveRequest(teamId: string, requestId: string): Promise<void> {
    return http(`/teams/${teamId}/join-requests/${requestId}/approve`, {
      method: 'POST',
    });
  },

  async rejectRequest(teamId: string, requestId: string): Promise<void> {
    return http(`/teams/${teamId}/join-requests/${requestId}/reject`, {
      method: 'POST',
    });
  },

  async changeCaptain(teamId: string, newCaptainId: string): Promise<void> {
    return http(`/teams/${teamId}/change-captain`, {
      method: 'POST',
      body: JSON.stringify({ newCaptainId }),
    });
  },

  async listMembers(teamId: string): Promise<TeamMemberInfo[]> {
    return http(`/teams/${teamId}/members`);
  },
};
