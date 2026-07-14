import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Team } from '../types';

export const getTeams = async (): Promise<Team[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'lfm_teams'));
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        name: data.name || doc.id,
        principal: data.principal || '',
        budgetRemainingM: data.budgetRemainingM || 0,
        isMotorist: data.isMotorist || false,
        motoristId: data.motoristId || null
      });
    });
    return teams;
  } catch (error) {
    console.error("Error fetching teams from Firestore:", error);
    return [];
  }
};

export const updateTeamBudget = async (teamId: string, newBudget: number): Promise<boolean> => {
  try {
    const teamRef = doc(db, 'lfm_teams', teamId);
    await updateDoc(teamRef, {
      budgetRemainingM: newBudget
    });
    return true;
  } catch (error) {
    console.error(`Error updating budget for team ${teamId}:`, error);
    return false;
  }
};
