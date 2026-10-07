import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { DetalleJornada } from '../pages/JornadaView';

export async function getJornadas(): Promise<DetalleJornada[]> {
  const querySnapshot = await getDocs(collection(db, 'jornadas'));
  const jornadas: DetalleJornada[] = [];
  querySnapshot.forEach((docSnap) => {
    jornadas.push(docSnap.data() as DetalleJornada);
  });
  return jornadas;
}

export async function getJornadaById(id: string): Promise<DetalleJornada | null> {
  const docRef = doc(db, 'jornadas', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as DetalleJornada;
  }
  return null;
}

export async function saveJornada(jornada: DetalleJornada): Promise<void> {
  const docRef = doc(db, 'jornadas', jornada.id);
  await setDoc(docRef, jornada);
}
