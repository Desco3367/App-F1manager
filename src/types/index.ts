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
  weightLevels?: Record<string, number>;
}

export interface WeightRequest {
  id: string;
  seasonId: string;
  teamId: string;
  pieceId: string;
  runs: number;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
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

export interface Engine {
  teamId: string;
  power: number;
  reliability: number;
}

export interface EngineRequest {
  id: string;
  seasonId: string;
  teamId: string;
  statId: 'power' | 'reliability';
  mode: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface TransferRequest {
  id: string;
  seasonId: string;
  teamFrom: string;
  teamTo: string;
  amountM: number;
  concept: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

