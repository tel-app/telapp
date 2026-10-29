import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  increment,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore for telapptz (handles standard default database or named database)
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  isGoldVerified: boolean;
  isPrivate?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

// Story Interface (24-hour expiring stories)
export interface StoryItem {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  isGoldVerified: boolean;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
}

// Post / Reel Interface
export interface PostItem {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  isGoldVerified: boolean;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  audioTrack: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration?: string;
  createdAt: string;
  likedByCurrentUser?: boolean;
}

// Comment Interface
export interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar: string;
  isGoldVerified: boolean;
  text: string;
  createdAt: string;
}

// Chat Message Interface
export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  text: string;
  createdAt: string;
}
