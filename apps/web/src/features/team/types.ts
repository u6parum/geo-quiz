import type { GamePhase } from '@shared/contracts';

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TeamWithLandmark {
  id: string;
  name: string;
  captainId: string;
  members: { userId: string }[];
  landmarks: { id: string; name: string; description: string }[];
}

export interface TeamGame {
  id: string;
  status: GamePhase;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface MyTeam {
  id: string;
  name: string;
  captainId: string;
  isCaptain: boolean;
  games: TeamGame[];
}

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  userId: string;
  status: JoinRequestStatus;
  createdAt: string;
  updatedAt: string;
  team?: { id: string; name: string };
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  } | null;
}

export interface TeamPublic {
  id: string;
  name: string;
  captainId: string;
  membersCount: number;
  landmarkName: string | null;
}

export interface TeamMemberInfo {
  userId: string;
  fullName: string;
  email: string;
  isCaptain: boolean;
}

export interface MyGame {
  id: string;
  status: GamePhase;
  startedAt: string | null;
  finishedAt: string | null;
  teamId: string;
  teamName: string;
}
