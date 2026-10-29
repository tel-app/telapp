import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Copy, 
  Send, 
  Phone, 
  CreditCard, 
  Key, 
  Crown,
  Clock,
  Layers,
  Search
} from 'lucide-react';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, UserProfile } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';
import { MASTER_VERIFICATION_CODES, isCodeValidFormat, cleanVerificationCode } from '../lib/verificationCodes';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onVerificationSuccess: (updatedUser: UserProfile) => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onVerificationSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'redeem' | 'owner'>('pay');
  const [inputCode, setInputCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  // Check if current user is owner (JobuLisulile@gmail.com)
  const isOwner = currentUser?.email?.toLowerCase() === 'jobulisulile@gmail.com';

  const [redeemedCodes, setRedeemedCodes] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('telapp_redeemed_codes');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPayment(label);
    setTimeout(() => setCopiedPayment(null), 2000);
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = cleanVerificationCode(inputCode);

    if (!isCodeValidFormat(cleanCode)) {
      setErrorMessage('Please enter a valid 8-digit verification code.');
      return;
    }

    // Check if code is in the official 500 master codes
    const isValidMasterCode = MASTER_VERIFICATION_CODES.includes(cleanCode);
    if (!isValidMasterCode) {
      setErrorMessage('Invalid verification code. Please confirm the 8-digit code received from the owner.');
      return;
    }

    // Check if already redeemed
    if (redeemedCodes.has(cleanCode)) {
      setErrorMessage('This verification code has already been redeemed and is no longer valid.');
      return;
    }

    setIsRedeeming(true);

    try {
      // Check in Firestore if already redeemed
      try {
        const codeRef = doc(db, 'redeemed_codes', cleanCode);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
          setErrorMessage('This verification code has already been used by another account.');
          setIsRedeeming(false);
          return;
        }
        // Mark as redeemed in Firestore
        await setDoc(codeRef, {
          code: cleanCode,
          redeemedBy: currentUser.uid,
          username: currentUser.username,
          email: currentUser.email,
          redeemedAt: new Date().toISOString()
        });
      } catch {
        // Fallback to local storage if Firestore rules restricted
      }

      // Update user doc in Firestore
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          isGoldVerified: true,
          verifiedAt: new Date().toISOString()
        });
      } catch {
        // Continue locally
      }

      // Update local storage redeemed set
      const nextRedeemed = new Set(redeemedCodes);
      nextRedeemed.add(cleanCode);
      setRedeemedCodes(nextRedeemed);
      localStorage.setItem('telapp_redeemed_codes', JSON.stringify(Array.from(nextRedeemed)));

      // Update current user profile
      const updatedProfile: UserProfile = {
        ...currentUser,
        isGoldVerified: true
      };

      setSuccessMessage('Congratulations! Your TelApp account is now officially Gold Verified with VIP privileges.');
      onVerificationSuccess(updatedProfile);

      setTimeout(() => {
        onClose();
      }, 2200);

    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification redemption failed. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const remainingCodesCount = MASTER_VERIFICATION_CODES.length - redeemedCodes.size;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-[90vh] sm:h-[680px] bg-[#16122c] border border-[#ffd700]/30 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_0_50px_rgba(255,215,0,0.15)] flex flex-col overflow-hidden text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ffd700]/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#ffd700] to-[#ffaa00] text-[#0b0914] shadow-md">
              <Crown className="w-5 h-5 fill-[#0b0914]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white">Gold Verification</h2>
                <GoldBadge size="sm" />
              </div>
              <span className="text-[11px] text-[#ffd700]">Official VIP Creator Status • 2,000 TSh</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-[#0b0914] p-1 border border-[#a29bfe]/15 text-xs my-2">
          <button
            type="button"
            onClick={() => { setActiveTab('pay'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pay' 
                ? 'bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] shadow-md' 
                : 'text-[#8b85b1] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>1. How to Pay (2,000 TSh)</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('redeem'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'redeem' 
                ? 'bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] shadow-md' 
                : 'text-[#8b85b1] hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>2. Enter 8-Digit Code</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => { setActiveTab('owner'); setErrorMessage(null); }}
              className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                activeTab === 'owner' 
                  ? 'bg-[#6c5ce7] text-white shadow-md' 
                  : 'text-[#a29bfe] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vault ({remainingCodesCount})</span>
            </button>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#ff4757]/15 border border-[#ff4757]/30 text-[#ff4757] text-xs flex items-center gap-2 mb-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#2ed573]/20 border border-[#2ed573]/50 text-[#2ed573] text-xs flex items-center gap-2 mb-2 animate-bounce">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: How to Pay (2,000 TSh) */}
        {activeTab === 'pay' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 py-1 text-xs">
            {/* VIP Perks Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#ffd700]/10 via-[#16122c] to-[#6c5ce7]/20 border border-[#ffd700]/30 space-y-2">
              <span className="text-xs font-bold text-[#ffd700] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Unlocked Gold Privileges:
              </span>
              <ul className="space-y-1.5 text-[#e2e0f0]">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#ffd700]" />
                  </div>
                  <span><strong>Shiny Gold Verification Badge</strong> next to your name</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#ffd700]" />
                  </div>
                  <span><strong>Unlimited Post Editing</strong> (bypass normal 24h editing limit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#ffd700]" />
                  </div>
                  <span><strong>High Priority Feed Placement</strong> in Discovery and Spotlight</span>
                </li>
              </ul>
            </div>

            {/* Payment Instructions */}
            <div className="p-3.5 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Tanzania Mobile Payment (2,000 TSh)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#ffd700]/20 text-[#ffd700] font-bold text-[10px]">
                  2,000 TZS
                </span>
              </div>
              <p className="text-[11px] text-[#8b85b1]">
                Pay 2,000 TSh to the owner. The owner will send your unique 8-digit secret verification code to unlock your badge immediately.
              </p>

              {/* Payment Details */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#16122c] border border-[#a29bfe]/15 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8b85b1] block">M-Pesa / Tigo Pesa / Airtel Money</span>
                    <span className="font-mono text-white text-xs font-bold">+255 768 200 488</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('+255768200488', 'phone')}
                    className="px-2.5 py-1 rounded-lg bg-[#211c42] hover:bg-[#6c5ce7] text-white text-[10px] flex items-center gap-1 transition-all"
                  >
                    {copiedPayment === 'phone' ? <Check className="w-3 h-3 text-[#2ed573]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPayment === 'phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[#16122c] border border-[#a29bfe]/15 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8b85b1] block">Owner Direct Email</span>
                    <span className="font-mono text-[#ffd700] text-xs font-bold">JobuLisulile@gmail.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('JobuLisulile@gmail.com', 'email')}
                    className="px-2.5 py-1 rounded-lg bg-[#211c42] hover:bg-[#6c5ce7] text-white text-[10px] flex items-center gap-1 transition-all"
                  >
                    {copiedPayment === 'email' ? <Check className="w-3 h-3 text-[#2ed573]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPayment === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`mailto:JobuLisulile@gmail.com?subject=TelApp%20Verification%20Payment%20(2000%20TSh)&body=Hello%20Jobu,%20I%20have%20paid%202000%20TSh%20for%20TelApp%20Gold%20Verification.%20My%20Username%20is:%20@${currentUser.username}%20and%20email%20is:%20${currentUser.email}.%20Please%20send%20my%208-digit%20verification%20code.`}
                  className="py-2.5 px-3 rounded-xl bg-[#211c42] hover:bg-[#6c5ce7] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Send className="w-3.5 h-3.5 text-[#a29bfe]" />
                  <span>Email Owner</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTab('redeem')}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Key className="w-3.5 h-3.5 text-[#0b0914]" />
                  <span>I Have My Code</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Enter 8-Digit Verification Code */}
        {activeTab === 'redeem' && (
          <form onSubmit={handleRedeemCode} className="flex-1 flex flex-col justify-between py-2">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0b0914] border border-[#ffd700]/30 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#ffd700] to-[#ffaa00] flex items-center justify-center shadow-lg shadow-[#ffd700]/20">
                  <Key className="w-6 h-6 text-[#0b0914]" />
                </div>
                <h3 className="text-sm font-bold text-white">Enter Your 8-Digit Secret Code</h3>
                <p className="text-[11px] text-[#8b85b1]">
                  Enter the unique 8-digit code issued by the owner after 2,000 TSh payment.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#ffd700] block mb-1.5">
                  8-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="e.g. 54115853 or 5411-5853"
                  className="w-full bg-[#0b0914] border border-[#ffd700]/40 rounded-2xl p-3.5 text-center text-lg font-mono tracking-widest text-[#ffd700] placeholder-[#8b85b1]/50 focus:outline-none focus:border-[#ffd700] shadow-inner"
                />
                <span className="text-[10px] text-[#8b85b1] block text-center mt-1.5">
                  Each code is single-use and permanently binds to your account @{currentUser.username}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="submit"
                disabled={isRedeeming || cleanVerificationCode(inputCode).length !== 8}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#ffd700] via-[#ffc048] to-[#ffa502] text-[#0b0914] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ffd700]/30 disabled:opacity-40 transition-all gpu-tap"
              >
                <span>{isRedeeming ? 'Validating Code...' : 'Activate Gold Verification Now'}</span>
                <Sparkles className="w-4 h-4 fill-[#0b0914]" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pay')}
                className="w-full py-2 text-center text-[11px] text-[#8b85b1] hover:text-white"
              >
                Need a code? View 2,000 TSh payment details
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Owner Code Vault (Only for JobuLisulile@gmail.com) */}
        {activeTab === 'owner' && isOwner && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-1 text-xs">
            <div className="p-3 rounded-xl bg-[#6c5ce7]/15 border border-[#6c5ce7]/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">Owner Code Management</span>
                <span className="text-[10px] text-[#a29bfe]">
                  {remainingCodesCount} of {MASTER_VERIFICATION_CODES.length} codes remaining
                </span>
              </div>
              <a
                href="/verification_codes_500.txt"
                download="TelApp_Verification_Codes_500.txt"
                className="px-2.5 py-1 rounded-lg bg-[#6c5ce7] text-white text-[10px] font-bold flex items-center gap-1"
              >
                Download .txt
              </a>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8b85b1] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={ownerSearchQuery}
                onChange={(e) => setOwnerSearchQuery(e.target.value)}
                placeholder="Search code or filter..."
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {MASTER_VERIFICATION_CODES
                .filter(c => !ownerSearchQuery || c.includes(ownerSearchQuery))
                .slice(0, 50)
                .map((code, idx) => {
                  const isRedeemed = redeemedCodes.has(code);
                  return (
                    <div 
                      key={code}
                      className={`p-2 rounded-xl border flex items-center justify-between font-mono text-xs ${
                        isRedeemed 
                          ? 'bg-black/40 border-red-500/20 text-[#8b85b1] opacity-50' 
                          : 'bg-[#0b0914] border-[#ffd700]/30 text-[#ffd700]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8b85b1]">{idx + 1}.</span>
                        <span className="font-bold">{code.slice(0, 4)}-{code.slice(4)}</span>
                        {isRedeemed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                            REDEEMED
                          </span>
                        )}
                      </div>
                      {!isRedeemed && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(code, code)}
                          className="px-2 py-0.5 rounded bg-[#211c42] hover:bg-[#6c5ce7] text-white text-[10px] flex items-center gap-1"
                        >
                          {copiedPayment === code ? <Check className="w-3 h-3 text-[#2ed573]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedPayment === code ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
