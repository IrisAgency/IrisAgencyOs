import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  getAuth
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { User, UserRole, Department, RoleDefinition } from '../types';
import { DEFAULT_ROLES } from '../constants';

interface AuthContextType {
  currentUser: User | null;
  roles: RoleDefinition[];
  loading: boolean;
  allowSignUp: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  inviteUser: (payload: InviteUserPayload) => Promise<{ tempPassword: string }>;
  completePasswordChange: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkPermission: (permissionCode: string) => boolean;
}

interface InviteUserPayload {
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  jobTitle?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowSignUp, setAllowSignUp] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  useEffect(() => {
    const checkExistingUsers = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'users'), limit(1)));
        setAllowSignUp(snapshot.empty);
      } catch (error) {
        console.error('Error checking existing users:', error);
        setAllowSignUp(false);
      } finally {
        setCheckingUsers(false);
      }
    };

    const fetchRoles = async () => {
      try {
        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        if (rolesSnapshot.empty) {
          const batch = writeBatch(db);
          DEFAULT_ROLES.forEach(role => {
            const roleRef = doc(db, 'roles', role.id);
            batch.set(roleRef, role);
          });
          await batch.commit();
          setRoles(DEFAULT_ROLES);
        } else {
          setRoles(rolesSnapshot.docs.map(d => d.data() as RoleDefinition));
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles(DEFAULT_ROLES); // Fallback
      }
    };

    checkExistingUsers();
    fetchRoles();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            
            if (userData.status === 'inactive') {
              await signOut(auth);
              setCurrentUser(null);
              return;
            }

            setCurrentUser({
              id: firebaseUser.uid,
              ...userData,
              passwordHash: userData.passwordHash || '',
              forcePasswordChange: !!userData.forcePasswordChange // Ensure boolean
            });
          } else {
            // Fallback if no firestore profile exists (e.g. new user or admin created)
            console.warn('User profile not found in Firestore');
            
            // Check if this is the first user (after a seed/reset)
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const isFirstUser = usersSnapshot.empty;
            
            const newRole = isFirstUser ? UserRole.GENERAL_MANAGER : UserRole.CLIENT;
            const newDept = isFirstUser ? Department.MANAGEMENT : Department.ACCOUNTS;

            const newUserProfile: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: newRole,
              department: newDept,
              avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.email || 'User')}`,
              status: 'active',
              dateJoined: new Date().toISOString().split('T')[0],
              jobTitle: isFirstUser ? 'General Manager' : 'Client',
              passwordHash: '',
              forcePasswordChange: false,
            };

            // Auto-create the missing profile
            await setDoc(userDocRef, newUserProfile);
            setCurrentUser(newUserProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, name: string) => {
    if (!allowSignUp) {
      throw new Error('Sign up is currently disabled. Please contact your administrator.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user document
    const newUser: User = {
      id: user.uid,
      name: name,
      email: email,
      role: UserRole.GENERAL_MANAGER, // Default to GM for testing
      department: Department.MANAGEMENT,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      status: 'active',
      dateJoined: new Date().toISOString().split('T')[0],
      jobTitle: 'New User',
      passwordHash,
      forcePasswordChange: false
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    setAllowSignUp(false);
  };

  const inviteUser = async ({ name, email, role, department, jobTitle }: InviteUserPayload) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('You must be logged in to invite a user.');
    }

    const tempPassword = generateTempPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Initialize a secondary app to create user without logging out the admin
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const newUserCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
      const newFirebaseUser = newUserCredential.user;

      const newUserDoc: User = {
        id: newFirebaseUser.uid,
        name,
        email,
        role,
        department,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        status: 'active',
        dateJoined: new Date().toISOString().split('T')[0],
        jobTitle: jobTitle || role,
        passwordHash: hashedTempPassword,
        forcePasswordChange: true
      };

      await setDoc(doc(db, 'users', newFirebaseUser.uid), newUserDoc);
      
      // Sign out the secondary user immediately
      await signOut(secondaryAuth);
      
      return { tempPassword };
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user.');
    } finally {
      // Clean up the secondary app
      // Note: deleteApp is async but we don't strictly need to await it here for the UI to proceed
      // import { deleteApp } from 'firebase/app'; 
      // deleteApp(secondaryApp); 
    }
  };

  const completePasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email || !currentUser) {
      throw new Error('No authenticated user.');
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateDoc(doc(db, 'users', currentUser.id), {
      passwordHash: newHash,
      forcePasswordChange: false,
      updatedAt: new Date().toISOString()
    });

    setCurrentUser({ ...currentUser, passwordHash: newHash, forcePasswordChange: false });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const checkPermission = (permissionCode: string): boolean => {
    if (!currentUser) return false;
    if (!roles || !Array.isArray(roles)) return false;
    
    const userRoleDef = roles.find(r => r && r.name === currentUser.role);
    if (!userRoleDef) return false;
    if (userRoleDef.isAdmin) return true;
    return userRoleDef.permissions && userRoleDef.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ currentUser, roles, loading: loading || checkingUsers, allowSignUp, login, signup, inviteUser, completePasswordChange, logout, checkPermission }}>
      {!(loading || checkingUsers) && children}
    </AuthContext.Provider>
  );
};
