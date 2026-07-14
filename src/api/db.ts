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

import { onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { Car, CarRequest } from '../types';

export const getCarByTeam = async (teamId: string): Promise<Car | null> => {
  try {
    const docRef = doc(db, 'lfm_teamCars', teamId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        teamId: snap.id,
        aero: data.aero || 0,
        chassis: data.chassis || 0,
        reliability: data.reliability || 0,
        weight: data.weight || 0
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching car:", error);
    return null;
  }
};

export const getAllCars = async (): Promise<Car[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'lfm_teamCars'));
    const cars: Car[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cars.push({
        teamId: doc.id,
        aero: data.aero || 0,
        chassis: data.chassis || 0,
        reliability: data.reliability || 0,
        weight: data.weight || 0
      });
    });
    return cars;
  } catch (error) {
    console.error("Error fetching all cars:", error);
    return [];
  }
};

export const subscribeToCarRequests = (callback: (requests: CarRequest[]) => void) => {
  const q = collection(db, 'lfm_carSelections');
  return onSnapshot(q, (snapshot) => {
    let allRequests: CarRequest[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.carRequests && Array.isArray(data.carRequests)) {
        allRequests = [...allRequests, ...data.carRequests.filter((r: any) => r.status === 'pending')];
      }
    });
    // Sort by createdAt ASC
    allRequests.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(allRequests);
  }, (error) => {
    console.error("Error subscribing to car requests:", error);
  });
};

export const updateCarStat = async (teamId: string, pieceId: string, newValue: number): Promise<boolean> => {
  try {
    const carRef = doc(db, 'lfm_teamCars', teamId);
    await updateDoc(carRef, {
      [pieceId]: newValue
    });
    return true;
  } catch (error) {
    console.error("Error updating car stat:", error);
    return false;
  }
};

export const resolveCarRequest = async (teamId: string, requestId: string, newStatus: 'approved' | 'rejected'): Promise<boolean> => {
  try {
    const selectionRef = doc(db, 'lfm_carSelections', teamId);
    const snap = await getDoc(selectionRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    if (!data.carRequests) return false;

    const updatedRequests = data.carRequests.map((r: any) => 
      r.id === requestId ? { ...r, status: newStatus } : r
    );

    await updateDoc(selectionRef, { carRequests: updatedRequests });
    return true;
  } catch (error) {
    console.error("Error resolving request:", error);
    return false;
  }
};

export const submitCarRequest = async (teamId: string, seasonId: string, mode: 'design' | 'research', pieceId: string, upgradeType: string, note: string): Promise<boolean> => {
  try {
    const selectionRef = doc(db, 'lfm_carSelections', teamId);
    const snap = await getDoc(selectionRef);
    
    const newRequest: CarRequest = {
      id: Math.random().toString(36).substring(2, 9),
      seasonId,
      teamId,
      mode,
      pieceId: pieceId as any,
      upgradeType,
      note,
      status: 'pending',
      createdAt: Date.now()
    };

    if (snap.exists()) {
      const data = snap.data();
      const requests = data.carRequests || [];
      await updateDoc(selectionRef, { carRequests: [...requests, newRequest] });
    } else {
      // Create doc if doesn't exist
      // Using updateDoc will fail, we should probably setDoc but for now we assume it exists 
      // as teams are initialized. We'll use setDoc with merge: true to be safe.
      await setDoc(selectionRef, { carRequests: [newRequest] }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error("Error submitting car request:", error);
    return false;
  }
};

import { Engine, EngineRequest } from '../types';

export const getAllEngines = async (): Promise<Engine[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'lfm_teamEngines'));
    const engines: Engine[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      engines.push({
        teamId: doc.id,
        power: data.power || 0,
        reliability: data.reliability || 0
      });
    });
    return engines;
  } catch (error) {
    console.error("Error fetching all engines:", error);
    return [];
  }
};

export const updateEngineStat = async (teamId: string, statId: 'power' | 'reliability', newValue: number): Promise<boolean> => {
  try {
    const engineRef = doc(db, 'lfm_teamEngines', teamId);
    await updateDoc(engineRef, {
      [statId]: newValue
    });
    return true;
  } catch (error) {
    console.error("Error updating engine stat:", error);
    return false;
  }
};

export const subscribeToEngineRequests = (callback: (requests: EngineRequest[]) => void) => {
  const q = collection(db, 'lfm_carSelections'); // requests are stored in carSelections
  return onSnapshot(q, (snapshot) => {
    let allRequests: EngineRequest[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.engineRequests && Array.isArray(data.engineRequests)) {
        allRequests = [...allRequests, ...data.engineRequests.filter((r: any) => r.status === 'pending')];
      }
    });
    allRequests.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(allRequests);
  }, (error) => {
    console.error("Error subscribing to engine requests:", error);
  });
};

export const submitEngineRequest = async (teamId: string, seasonId: string, statId: 'power' | 'reliability', mode: string, note: string): Promise<boolean> => {
  try {
    const selectionRef = doc(db, 'lfm_carSelections', teamId);
    const snap = await getDoc(selectionRef);
    
    const newRequest: EngineRequest = {
      id: Math.random().toString(36).substring(2, 9),
      seasonId,
      teamId,
      statId,
      mode,
      note,
      status: 'pending',
      createdAt: Date.now()
    };

    if (snap.exists()) {
      const data = snap.data();
      const requests = data.engineRequests || [];
      await updateDoc(selectionRef, { engineRequests: [...requests, newRequest] });
    } else {
      await setDoc(selectionRef, { engineRequests: [newRequest] }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error("Error submitting engine request:", error);
    return false;
  }
};

export const resolveEngineRequest = async (teamId: string, requestId: string, newStatus: 'approved' | 'rejected'): Promise<boolean> => {
  try {
    const selectionRef = doc(db, 'lfm_carSelections', teamId);
    const snap = await getDoc(selectionRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    if (!data.engineRequests) return false;

    const updatedRequests = data.engineRequests.map((r: any) => 
      r.id === requestId ? { ...r, status: newStatus } : r
    );

    await updateDoc(selectionRef, { engineRequests: updatedRequests });
    return true;
  } catch (error) {
    console.error("Error resolving engine request:", error);
    return false;
  }
};
