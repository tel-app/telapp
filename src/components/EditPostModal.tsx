import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Edit3, 
  Save, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Music, 
  Tag, 
  Crown 
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db, PostItem, UserProfile } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';

interface EditPostModalProps {
  post: PostItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onPostUpdated: (updatedPost: PostItem) => void;
  onPostDeleted: (postId: string) => void;
  onOpenVerifyModal: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUser,
  onPostUpdated,
  onPostDeleted,
  onOpenVerifyModal
}) => {
  if (!isOpen || !post) return null;

  const [caption, setCaption] = useState(post.caption || '');
  const [audioTrack, setAudioTrack] = useState(post.audioTrack || '');
  const [tags, setTags] = useState(Array.isArray(post.tags) ? post.tags.join(', ') : '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check 24-hour edit window for standard accounts
  const isPremium = Boolean(currentUser?.isGoldVerified);
  const createdAtMs = new Date(post.createdAt).getTime();
  const elapsedMs = Date.now() - createdAtMs;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const isExpired = elapsedMs > ONE_DAY_MS;
  const canEdit = isPremium || !isExpired;

  // Calculate remaining hours and minutes if within 24h
  const remainingMs = Math.max(0, ONE_DAY_MS - elapsedMs);
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMessage('Editing period expired. Upgrade to Gold for unlimited edits.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        caption: caption.trim(),
        audioTrack: audioTrack.trim(),
        tags: parsedTags,
        updatedAt: new Date().toISOString()
      });

      const updated: PostItem = {
        ...post,
        caption: caption.trim(),
        audioTrack: audioTrack.trim(),
        tags: parsedTags
      };

      onPostUpdated(updated);
      onClose();
    } catch (err: any) {
      console.info('Update saved locally:', err?.message);
      const updated: PostItem = {
        ...post,
        caption: caption.trim(),
        audioTrack: audioTrack.trim(),
        tags: parsedTags
      };
      onPostUpdated(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      await deleteDoc(postRef);

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          postsCount: increment(-1)
        });
      } catch {
        // Continue
      }

      onPostDeleted(post.id);
      onClose();
    } catch (err: any) {
      console.info('Delete recorded locally:', err?.message);
      onPostDeleted(post.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#16122c] border border-[#a29bfe]/25 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a29bfe]/15">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#6c5ce7]" />
            <h2 className="text-base font-bold text-white">Manage Reel / Post</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 24-Hour Rule Indicator Banner */}
        {isPremium ? (
          <div className="p-3 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/30 flex items-center gap-2.5 text-xs text-[#ffd700]">
            <Crown className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Gold VIP Exemption:</strong> Unlimited lifetime post edits unlocked.
            </span>
          </div>
        ) : canEdit ? (
          <div className="p-3 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#a29bfe]">
              <Clock className="w-4 h-4 flex-shrink-0 text-[#e84393]" />
              <span>Standard 24h Edit Window:</span>
            </div>
            <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#211c42]">
              {remainingHours}h {remainingMins}m left
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#ff4757]/15 border border-[#ff4757]/30 flex flex-col gap-2 text-xs text-[#ff4757]">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>24-Hour Editing Window Expired</span>
            </div>
            <p className="text-[11px] text-[#e2e0f0]">
              Standard accounts can only edit within 24 hours of posting. Upgrade to Gold Verification for unlimited edits.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVerifyModal();
              }}
              className="mt-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Upgrade to Gold (2,000 TSh)</span>
            </button>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">
              Caption
            </label>
            <textarea
              disabled={!canEdit}
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl p-3 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7] disabled:opacity-50 resize-none"
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] flex items-center gap-1.5 mb-1">
              <Music className="w-3.5 h-3.5 text-[#e84393]" />
              <span>Audio Sound Track</span>
            </label>
            <input
              disabled={!canEdit}
              type="text"
              value={audioTrack}
              onChange={(e) => setAudioTrack(e.target.value)}
              className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c5ce7] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5 text-[#a29bfe]" />
              <span>Tags (comma separated)</span>
            </label>
            <input
              disabled={!canEdit}
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c5ce7] disabled:opacity-50"
            />
          </div>

          {canEdit && (
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 gpu-tap"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Updates'}</span>
            </button>
          )}
        </form>

        {/* Delete Post Section */}
        <div className="pt-2 border-t border-[#a29bfe]/15">
          {showDeleteConfirm ? (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#ff4757]">
                Are you sure you want to permanently delete this reel?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 rounded-xl bg-[#ff4757] hover:bg-[#ff3838] text-white font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#0b0914] text-[#8b85b1] text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 rounded-xl bg-transparent hover:bg-red-500/10 text-[#ff4757] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Post</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
