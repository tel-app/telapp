import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Sparkles, Image as ImageIcon, Video, Check } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, UserProfile, StoryItem } from '../lib/firebase';
import { generateVideoThumbnail, generateImageThumbnail, saveMediaBlob } from '../lib/mediaStorage';
import { GoldBadge } from './GoldBadge';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onStoryCreated: (story: StoryItem) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStoryCreated
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const isVid = file.type.startsWith('video');
    setIsVideo(isVid);

    const objUrl = URL.createObjectURL(file);
    setFilePreview(objUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const storyId = `story_${Date.now()}`;
      let finalMediaUrl = '';
      let thumbUrl = '';

      if (isVideo) {
        // Save video blob in local IndexedDB
        await saveMediaBlob(storyId, selectedFile);
        finalMediaUrl = `idb:${storyId}`;
        const generated = await generateVideoThumbnail(selectedFile);
        thumbUrl = generated.thumbnailUrl;
      } else {
        // Generate compressed image thumbnail for cross-device view
        const imgThumb = await generateImageThumbnail(selectedFile);
        finalMediaUrl = imgThumb;
        thumbUrl = imgThumb;
      }

      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newStory: StoryItem = {
        id: storyId,
        userId: currentUser.uid,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        isGoldVerified: Boolean(currentUser.isGoldVerified),
        mediaUrl: finalMediaUrl,
        thumbnailUrl: thumbUrl,
        caption: caption.trim() || undefined,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString()
      };

      try {
        await addDoc(collection(db, 'stories'), newStory);
      } catch {
        // Local fallback
      }

      onStoryCreated(newStory);
      onClose();
    } catch (err: any) {
      console.error('Story upload error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#16122c] border border-[#a29bfe]/25 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a29bfe]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c5ce7] to-[#e84393] flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add to 24h Story</h2>
              <span className="text-[11px] text-[#8b85b1]">Disappears after 24 hours</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Creator Identity */}
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/10">
          <img src={currentUser.avatar} alt={currentUser.username} className="w-8 h-8 rounded-full object-cover border border-[#6c5ce7]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">@{currentUser.username}</span>
            {currentUser.isGoldVerified && <GoldBadge size="sm" />}
          </div>
        </div>

        {/* Media Upload Area */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {filePreview ? (
            <div className="relative aspect-[9/16] max-h-[320px] mx-auto rounded-2xl overflow-hidden bg-black border border-[#6c5ce7] flex items-center justify-center group">
              {isVideo ? (
                <video src={filePreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={filePreview} alt="Story preview" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] text-white font-bold hover:bg-[#6c5ce7]"
              >
                Change Media
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-[#a29bfe]/30 hover:border-[#6c5ce7] bg-[#0b0914] p-8 flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center gpu-tap"
            >
              <div className="w-12 h-12 rounded-full bg-[#211c42] flex items-center justify-center text-[#e84393]">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white block">Choose Photo or Video Story</span>
              <span className="text-[10px] text-[#8b85b1]">Supports gallery files, moments & clips</span>
            </div>
          )}

          {/* Optional Caption */}
          <div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a story caption (optional)..."
              className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl px-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
              maxLength={120}
            />
          </div>

          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 disabled:opacity-40 gpu-tap"
          >
            <span>{isSubmitting ? 'Sharing to Story...' : 'Share to My Story'}</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
