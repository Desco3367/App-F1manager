export interface Team {
  id: string;
  name: string;
  principal: string;
  budgetRemainingM: number;
  isMotorist: boolean;
  motoristId: string | null;
}

export interface Car {
  teamId: string;
  aero: number;
  chassis: number;
  reliability: number;
  weight: number;
}

export interface CarRequest {
  id: string;
  seasonId: string;
  teamId: string;
  mode: 'design' | 'research';
  pieceId: 'aero' | 'chassis' | 'reliability' | 'weight';
  upgradeType: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

