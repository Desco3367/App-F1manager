export interface Team {
  id: string;
  name: string;
  principal: string;
  budgetRemainingM: number;
  isMotorist: boolean;
  motoristId: string | null;
}
