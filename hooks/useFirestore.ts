import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useFirestoreCollection<T = DocumentData>(collectionName: string, defaultValue: T[] = []): [T[], boolean, Error | null] {
  const { currentUser } = useAuth();
  const [data, setData] = useState<T[]>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, collectionName));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching collection ${collectionName}:`, err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, currentUser]);

  return [data, loading, error];
}
