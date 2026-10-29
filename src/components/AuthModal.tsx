import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  AtSign, 
  User, 
  Sparkles, 
  Check, 
  AlertCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, UserProfile, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';
import { saveAccountToSessions } from '../lib/accountSessions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'valid' | 'taken' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate standard username from email
  useEffect(() => {
    if (mode === 'signup' && email && (!username || usernameStatus === 'idle')) {
      const prefix = email.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '_')
        .slice(0, 20);
      if (prefix.length >= 3) {
        setUsername(prefix);
        checkUsernameAvailability(prefix);
      }
    }
  }, [email, mode]);

  const checkUsernameAvailability = async (name: string) => {
    const sanitized = name.toLowerCase().trim();
    if (!/^[a-z0-9_.]{3,30}$/.test(sanitized)) {
      setUsernameStatus('invalid');
      return;
    }

    setIsCheckingUsername(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', sanitized));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setUsernameStatus('valid');
      } else {
        setUsernameStatus('taken');
      }
    } catch (err) {
      // If permission error or initial empty db, allow valid
      setUsernameStatus('valid');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (val: string) => {
    const formatted = val.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(formatted);
    if (formatted.length >= 3) {
      checkUsernameAvailability(formatted);
    } else {
      setUsernameStatus('invalid');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (usernameStatus !== 'valid') {
          setErrorMessage('Please choose a valid and unique standard username (3-30 letters, numbers, _ or .)');
          setIsLoading(false);
          return;
        }

        // Create Firebase Auth user
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            // Sign in directly if already registered
            userCredential = await signInWithEmailAndPassword(auth, email, password);
          } else {
            throw authErr;
          }
        }

        const uid = userCredential.user.uid;
        const isOwner = email.toLowerCase() === 'jobulisulile@gmail.com';
        const profileData: UserProfile = {
          uid,
          email,
          username: username.toLowerCase().trim(),
          displayName: displayName.trim() || username,
          avatar: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 50)}?w=150&auto=format&fit=crop&q=80`,
          bio: 'Creator & streamer on TelApp. Powered by real-time streams.',
          isGoldVerified: isOwner, // Normal account by default; verified requires 2,000 TSh code
          isPrivate: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: new Date().toISOString()
        };

        // Store profile in Firestore
        await setDoc(doc(db, 'users', uid), profileData);
        saveAccountToSessions(profileData);
        onSuccess(profileData);
        onClose();
      } else {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, 'users', uid));

        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          saveAccountToSessions(profile);
          onSuccess(profile);
        } else {
          // Create fallback profile if missing
          const defaultProfile: UserProfile = {
            uid,
            email,
            username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '_'),
            displayName: email.split('@')[0],
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            bio: 'TelApp member',
            isGoldVerified: email.toLowerCase() === 'jobulisulile@gmail.com',
            isPrivate: false,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), defaultProfile);
          saveAccountToSessions(defaultProfile);
          onSuccess(defaultProfile);
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google (Gmail) Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;
      const uid = fbUser.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        saveAccountToSessions(profile);
        onSuccess(profile);
      } else {
        const emailPrefix = (fbUser.email?.split('@')[0] || 'creator')
          .toLowerCase()
          .replace(/[^a-z0-9_.]/g, '_')
          .slice(0, 20);

        const newProfile: UserProfile = {
          uid,
          email: fbUser.email || '',
          username: emailPrefix || `user_${uid.slice(0, 6)}`,
          displayName: fbUser.displayName || emailPrefix,
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          bio: 'Creator & streamer on TelApp. Verified via Gmail.',
          isGoldVerified: fbUser.email?.toLowerCase() === 'jobulisulile@gmail.com',
          isPrivate: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid), newProfile);
        saveAccountToSessions(newProfile);
        onSuccess(newProfile);
      }
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
        setErrorMessage(
          `Domain not authorized yet: Please go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ${host}`
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google popup was closed. You can also sign in with email below.');
      } else {
        setErrorMessage(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#16122c] border border-[#a29bfe]/25 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#a29bfe]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c5ce7] to-[#e84393] flex items-center justify-center font-bold text-white text-sm shadow-md">
              T
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'signup' ? 'Create TelApp Account' : 'Welcome Back'}
              </h2>
              <span className="text-[11px] text-[#8b85b1]">
                {mode === 'signup' ? 'Claim your unique standard username' : 'Sign in with your email or Gmail'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#ff4757]/15 border border-[#ff4757]/30 text-[#ff4757] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        {/* Continue with Google (Gmail) Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#ffffff] hover:bg-[#f1f2f6] text-[#1e293b] font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all gpu-tap disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google (Gmail)</span>
        </button>

        <div className="flex items-center gap-2 my-0.5">
          <div className="flex-1 h-[1px] bg-[#a29bfe]/20"></div>
          <span className="text-[10px] uppercase font-bold text-[#8b85b1]">or with email</span>
          <div className="flex-1 h-[1px] bg-[#a29bfe]/20"></div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
          
          {/* Email Input */}
          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#8b85b1] absolute left-3 pointer-events-none" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#8b85b1] absolute left-3 pointer-events-none" />
              <input 
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>
          </div>

          {/* Standard Unique Username Input (Sign-up only) */}
          {mode === 'signup' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-[#a29bfe]">
                  Standard Unique Username
                </label>
                {isCheckingUsername && (
                  <span className="text-[10px] text-[#a29bfe] animate-pulse">Checking...</span>
                )}
                {!isCheckingUsername && usernameStatus === 'valid' && (
                  <span className="text-[10px] text-[#2ed573] flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> Available
                  </span>
                )}
                {!isCheckingUsername && usernameStatus === 'taken' && (
                  <span className="text-[10px] text-[#ff4757]">Already taken</span>
                )}
              </div>
              <div className="relative flex items-center">
                <AtSign className="w-4 h-4 text-[#8b85b1] absolute left-3 pointer-events-none" />
                <input 
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. alex_streamer"
                  className={`w-full bg-[#0b0914] border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none ${
                    usernameStatus === 'valid' 
                      ? 'border-[#2ed573]' 
                      : usernameStatus === 'taken' 
                        ? 'border-[#ff4757]' 
                        : 'border-[#a29bfe]/20 focus:border-[#6c5ce7]'
                  }`}
                  maxLength={30}
                />
              </div>
              <p className="text-[10px] text-[#8b85b1] mt-1">
                Lowercase alphanumeric with _ or . only (Instagram style).
              </p>
            </div>
          )}

          {/* Normal Account Notice */}
          {mode === 'signup' && (
            <div className="p-3 rounded-2xl border bg-[#0b0914] border-[#a29bfe]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#211c42] border border-[#a29bfe]/30 flex items-center justify-center text-[#a29bfe]">
                  <ShieldCheck className="w-4 h-4 text-[#a29bfe]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Standard Free Creator Account
                  </span>
                  <span className="text-[10px] text-[#8b85b1]">
                    Gold badge is unlocked via 2,000 TSh activation code
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6c5ce7]/20 text-[#a29bfe] font-bold">
                Normal
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 disabled:opacity-50 gpu-tap"
          >
            <span>{isLoading ? 'Processing...' : (mode === 'signup' ? 'Create Account & Join' : 'Sign In')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Signin / Signup */}
        <div className="text-center text-xs text-[#8b85b1]">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(null); }}
                className="text-[#a29bfe] font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(null); }}
                className="text-[#a29bfe] font-bold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
