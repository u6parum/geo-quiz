import { http } from '@api/http';

export interface TeamApplication {
  id: string;
  userId: string;
  teamName: string;
  landmarkName: string;
  description: string;
  hints: { group: number; text: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teamId?: string;
  createdAt: string;
}

export const teamApplicationApi = {
  async submit(payload: {
    teamName: string;
    landmarkName: string;
    description: string;
    hints: { group: number; text: string }[];
  }): Promise<TeamApplication> {
    return http('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMy(): Promise<TeamApplication | null> {
    return http('/applications/my');
  },

  async getAll(): Promise<TeamApplication[]> {
    return http('/applications');
  },

  async approve(id: string): Promise<void> {
    return http(`/applications/${id}/approve`, { method: 'POST' });
  },

  async reject(id: string): Promise<void> {
    return http(`/applications/${id}/reject`, { method: 'POST' });
  },
};
