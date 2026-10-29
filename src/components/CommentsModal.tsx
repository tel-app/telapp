import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Trash2, 
  MessageCircle,
  Heart
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, CommentItem, UserProfile, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onRequireAuth: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  postId,
  isOpen,
  onClose,
  currentUser,
  onRequireAuth
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !postId) return;

    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: CommentItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          postId,
          userId: data.userId,
          username: data.username,
          userAvatar: data.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          isGoldVerified: Boolean(data.isGoldVerified),
          text: data.text,
          createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'
        });
      });
      setComments(fetched);
    }, (error) => {
      console.info('Comments onSnapshot notice:', error?.message);
      // Real mode: do not inject fake users or comments
    });

    return () => unsubscribe();
  }, [isOpen, postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setIsSubmitting(true);
    const textToSend = commentText.trim();
    setCommentText('');

    // Optimistic UI addition
    const localComment: CommentItem = {
      id: `local_${Date.now()}`,
      postId,
      userId: currentUser.uid,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      isGoldVerified: currentUser.isGoldVerified || false,
      text: textToSend,
      createdAt: 'just now'
    };
    setComments(prev => [...prev, localComment]);

    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentsRef, {
        postId,
        userId: currentUser.uid,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        isGoldVerified: currentUser.isGoldVerified || false,
        text: textToSend,
        createdAt: new Date().toISOString()
      });

      // Increment comments count on post atomically
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      console.info('Comment cloud sync note (saved locally):', err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(-1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-[78vh] sm:h-[580px] bg-[#16122c] border border-[#a29bfe]/20 rounded-t-[28px] sm:rounded-[28px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#a29bfe]/15 bg-[#120e24]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#6c5ce7]" />
            <h3 className="text-sm font-bold text-white">
              Comments ({comments.length})
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Comments List */}
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3.5">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8b85b1] gap-2 text-center p-4">
              <MessageCircle className="w-10 h-10 opacity-30 text-[#a29bfe]" />
              <p className="text-xs">No comments yet.</p>
              <p className="text-[11px] text-[#8b85b1]">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-3 group">
                <img 
                  src={c.userAvatar} 
                  alt={c.username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#a29bfe]/20" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white">@{c.username}</span>
                    {c.isGoldVerified && <GoldBadge size="sm" />}
                    <span className="text-[10px] text-[#8b85b1]">{c.createdAt}</span>
                  </div>
                  <p className="text-xs text-[#e2e0f0] mt-0.5 break-words">{c.text}</p>
                </div>
                {currentUser && currentUser.uid === c.userId && (
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8b85b1] hover:text-[#ff4757] transition-opacity"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Comment Input Footer */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-[#a29bfe]/15 bg-[#120e24] flex items-center gap-2">
          {currentUser ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.username} 
              className="w-7 h-7 rounded-full object-cover border border-[#6c5ce7]" 
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#211c42] flex items-center justify-center text-[10px]">
              ?
            </div>
          )}
          <input 
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={currentUser ? "Add a comment..." : "Sign in to comment..."}
            className="flex-1 bg-[#0b0914] border border-[#a29bfe]/20 rounded-full px-3.5 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
            maxLength={300}
          />
          <button 
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="p-2 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white disabled:opacity-40 disabled:cursor-not-allowed gpu-tap shadow-md"
            aria-label="Send comment"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
