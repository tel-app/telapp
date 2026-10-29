import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Lock, 
  Globe, 
  Users, 
  Plus, 
  Check, 
  Crown, 
  Sparkles, 
  Smartphone, 
  LogOut, 
  Trash2, 
  ChevronRight,
  Edit3,
  Save,
  AlertCircle
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, UserProfile } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';
import { getSavedAccounts, saveAccountToSessions, removeAccountFromSessions } from '../lib/accountSessions';

interface AccountCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenVerifyModal: () => void;
  onSwitchAccount: (account: UserProfile) => void;
  onAddNewAccount: () => void;
  onSignOut: () => void;
  deferredPrompt?: any;
}

export const AccountCenterModal: React.FC<AccountCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onOpenVerifyModal,
  onSwitchAccount,
  onAddNewAccount,
  onSignOut,
  deferredPrompt
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'accounts' | 'edit'>('accounts');
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [isPrivate, setIsPrivate] = useState<boolean>(Boolean(currentUser.isPrivate));
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedAccounts(getSavedAccounts());
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || '');
      setIsPrivate(Boolean(currentUser.isPrivate));
      setSaveMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Toggle Public vs Private Account
  const handleTogglePrivacy = async (privateVal: boolean) => {
    setIsPrivate(privateVal);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        isPrivate: privateVal
      });
      const updated = { ...currentUser, isPrivate: privateVal };
      saveAccountToSessions(updated);
      onUpdateProfile(updated);
      setSaveMessage(privateVal ? 'Account switched to Private' : 'Account switched to Public');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      // Offline fallback
      const updated = { ...currentUser, isPrivate: privateVal };
      saveAccountToSessions(updated);
      onUpdateProfile(updated);
    }
  };

  // Save Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim()
      });
      const updated = {
        ...currentUser,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim()
      };
      saveAccountToSessions(updated);
      onUpdateProfile(updated);
      setSaveMessage('Profile changes saved successfully');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      const updated = {
        ...currentUser,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim()
      };
      saveAccountToSessions(updated);
      onUpdateProfile(updated);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Switch to Another Account
  const handleSelectAccount = (account: UserProfile) => {
    if (account.uid === currentUser.uid) return;
    onSwitchAccount(account);
    onClose();
  };

  // Remove Account from Saved List
  const handleRemoveAccount = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    const updated = removeAccountFromSessions(uid);
    setSavedAccounts(updated);
    if (uid === currentUser.uid) {
      onSignOut();
      onClose();
    }
  };

  // Trigger PWA Install
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setSaveMessage('TelApp installed successfully!');
      }
    } else {
      alert('To install TelApp on iPhone: tap the Share button in Safari and choose "Add to Home Screen". On Android/Chrome: tap menu (⋮) and choose "Install App".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-[90vh] sm:h-[680px] bg-[#16122c] border border-[#a29bfe]/25 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col overflow-hidden text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a29bfe]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c5ce7] to-[#e84393] flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Account Center</h2>
              <span className="text-[11px] text-[#8b85b1]">Settings, privacy & multi-account switch</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#0b0914] p-1 border border-[#a29bfe]/15 text-xs my-2">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'accounts' 
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white shadow-md' 
                : 'text-[#8b85b1] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Accounts Switcher</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'privacy' 
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white shadow-md' 
                : 'text-[#8b85b1] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy (Public/Private)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'edit' 
                ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white shadow-md' 
                : 'text-[#8b85b1] hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Status Toast */}
        {saveMessage && (
          <div className="p-2.5 rounded-xl bg-[#2ed573]/20 border border-[#2ed573]/50 text-[#2ed573] text-xs flex items-center gap-2 mb-2 animate-fade-in">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Tab 1: Multi-Account Switcher & Management */}
        {activeTab === 'accounts' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-1 text-xs">
            
            {/* Verification Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              currentUser.isGoldVerified
                ? 'bg-[#ffd700]/10 border-[#ffd700]/40 shadow-[0_0_20px_rgba(255,215,0,0.12)]'
                : 'bg-[#0b0914] border-[#a29bfe]/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentUser.isGoldVerified ? 'bg-[#ffd700]/20 text-[#ffd700]' : 'bg-[#211c42] text-[#8b85b1]'
                }`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      {currentUser.isGoldVerified ? 'VIP Gold Creator' : 'Standard Profile'}
                    </span>
                    {currentUser.isGoldVerified && <GoldBadge size="sm" />}
                  </div>
                  <span className="text-[10px] text-[#8b85b1]">
                    {currentUser.isGoldVerified 
                      ? 'Verified badge active • Unlimited post edits unlocked'
                      : 'Not verified. Requires 2,000 TSh activation code.'}
                  </span>
                </div>
              </div>
              {!currentUser.isGoldVerified && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVerifyModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] font-bold text-[11px] shadow-md hover:scale-105 transition-all"
                >
                  Verify (2,000 TSh)
                </button>
              )}
            </div>

            {/* Switch Between Logged-in Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider">
                  Logged In Accounts on this Device
                </span>
                <span className="text-[10px] text-[#8b85b1]">
                  {savedAccounts.length} saved
                </span>
              </div>

              <div className="space-y-2">
                {savedAccounts.map((account) => {
                  const isActive = account.uid === currentUser.uid;
                  return (
                    <div
                      key={account.uid}
                      onClick={() => handleSelectAccount(account)}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#6c5ce7]/20 border-[#6c5ce7] shadow-lg shadow-[#6c5ce7]/10'
                          : 'bg-[#0b0914] border-[#a29bfe]/15 hover:border-[#a29bfe]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={account.avatar}
                          alt={account.username}
                          className="w-10 h-10 rounded-full object-cover border border-[#a29bfe]/20"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">@{account.username}</span>
                            {account.isGoldVerified && <GoldBadge size="sm" />}
                            {account.isPrivate && <Lock className="w-3 h-3 text-[#ffd700]" />}
                          </div>
                          <span className="text-[10px] text-[#8b85b1]">{account.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#2ed573]/20 text-[#2ed573] text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#a29bfe] font-semibold hover:underline">
                            Switch
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, account.uid)}
                          className="p-1.5 rounded-lg text-[#8b85b1] hover:text-[#ff4757] hover:bg-[#ff4757]/10 transition-colors"
                          title="Remove from device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add or Create Another Account */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddNewAccount();
              }}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#a29bfe]/30 hover:border-[#6c5ce7] bg-[#0b0914] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all gpu-tap"
            >
              <Plus className="w-4 h-4 text-[#e84393]" />
              <span>Add / Create Another Account (Multi-Account)</span>
            </button>

            {/* PWA Install Button */}
            <div className="p-3.5 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/image_23f1ad3d.png"
                  alt="TelApp App Icon"
                  className="w-9 h-9 rounded-xl shadow-md"
                />
                <div>
                  <span className="text-xs font-bold text-white block">TelApp PWA Mobile App</span>
                  <span className="text-[10px] text-[#8b85b1]">Install on Home Screen for full screen mode</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-3 py-1.5 rounded-xl bg-[#211c42] hover:bg-[#6c5ce7] text-white font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            </div>

            {/* Log Out Current Session */}
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#ff4757] text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out @{currentUser.username}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Public vs Private Account Settings */}
        {activeTab === 'privacy' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-2 text-xs">
            <div className="p-4 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isPrivate ? 'bg-[#ffd700]/20 text-[#ffd700]' : 'bg-[#6c5ce7]/20 text-[#a29bfe]'
                  }`}>
                    {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isPrivate ? 'Private Account Active' : 'Public Account Active'}
                    </span>
                    <span className="text-[10px] text-[#8b85b1]">
                      {isPrivate 
                        ? 'Only users you approve can view your reels and stories.'
                        : 'Anyone on TelApp can view your profile and streams.'}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => handleTogglePrivacy(!isPrivate)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    isPrivate ? 'bg-[#ffd700]' : 'bg-[#211c42] border border-[#a29bfe]/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="pt-2 border-t border-[#a29bfe]/10 space-y-1 text-[11px] text-[#8b85b1]">
                <p>• <strong>Public:</strong> Videos can trend in Discovery Engine and Curated Spotlight.</p>
                <p>• <strong>Private:</strong> Existing followers will still see your content; new viewers must follow you.</p>
              </div>
            </div>

            {/* Standard Username Uniqueness Rules */}
            <div className="p-3.5 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/15 space-y-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2ed573]" />
                Standard Unique Username Policy
              </span>
              <p className="text-[11px] text-[#8b85b1]">
                Your current username is <span className="text-white font-mono font-bold">@{currentUser.username}</span>. TelApp guarantees zero duplicate usernames across the entire platform.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Edit Profile */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name or Brand"
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
                maxLength={40}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
              />
              {avatar && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={avatar} alt="Preview" className="w-8 h-8 rounded-full object-cover border border-[#6c5ce7]" />
                  <span className="text-[10px] text-[#8b85b1]">Avatar Preview</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
                Bio Description
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief intro..."
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl p-3 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7] resize-none"
                maxLength={200}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 gpu-tap"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
