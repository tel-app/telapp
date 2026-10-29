import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Plus,
  Compass,
  Tv,
  User as UserIcon,
  Search,
  Send,
  MoreVertical,
  SlidersHorizontal,
  Check,
  Sparkles,
  Music,
  Play,
  Pause,
  LogOut,
  LogIn,
  Eye,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  X,
  Crown,
  Settings,
  Camera,
  Layers,
  Lock,
  Globe
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  increment, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, db, UserProfile, PostItem, StoryItem, handleFirestoreError, OperationType } from './lib/firebase';
import { GoldBadge } from './components/GoldBadge';
import { ShareModal, ShareTargetItem } from './components/ShareModal';
import { CommentsModal } from './components/CommentsModal';
import { ChatModal } from './components/ChatModal';
import { AuthModal } from './components/AuthModal';
import { CreatePostModal } from './components/CreatePostModal';
import { VerifyModal } from './components/VerifyModal';
import { AccountCenterModal } from './components/AccountCenterModal';
import { EditPostModal } from './components/EditPostModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { MediaDisplay } from './components/MediaDisplay';
import { saveAccountToSessions, getSavedAccounts } from './lib/accountSessions';

export default function App() {
  // Navigation View State
  const [activeTab, setActiveTab] = useState<'feed' | 'discovery' | 'spotlight' | 'profile'>('feed');
  
  // Real-time Data (pure real data from Firestore)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showRulesBanner, setShowRulesBanner] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Active Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isAccountCenterOpen, setIsAccountCenterOpen] = useState(false);
  const [activeEditPost, setActiveEditPost] = useState<PostItem | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeSharePost, setActiveSharePost] = useState<PostItem | null>(null);
  const [activeShareTarget, setActiveShareTarget] = useState<ShareTargetItem | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<{ uid: string; username: string; avatar: string; isGoldVerified: boolean } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Interactive Playback State
  const [isMuted, setIsMuted] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [heartBurstPostId, setHeartBurstPostId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    'All',
    'Trending',
    'Live Streams',
    'Gaming',
    'Music & Beats',
    'Cinematic',
    'Shorts',
    'Tech & Code'
  ];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as UserProfile);
          } else {
            // Initial fallback profile with zero fake counts
            const fallback: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || 'user@telapp.stream',
              username: (fbUser.email?.split('@')[0] || 'creator').replace(/[^a-z0-9_.]/g, '_'),
              displayName: fbUser.displayName || 'TelApp Streamer',
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              bio: 'Streaming high quality video on TelApp.',
              isGoldVerified: true,
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', fbUser.uid), fallback);
            setCurrentUser(fallback);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Posts Subscription (Instant live likes, comments count, new reels)
  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetched: PostItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          userId: data.userId,
          username: data.username,
          userAvatar: data.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          isGoldVerified: Boolean(data.isGoldVerified),
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl,
          caption: data.caption,
          audioTrack: data.audioTrack || 'Original Sound',
          tags: Array.isArray(data.tags) ? data.tags : [],
          likesCount: Number(data.likesCount) || 0,
          commentsCount: Number(data.commentsCount) || 0,
          sharesCount: Number(data.sharesCount) || 0,
          duration: data.duration || '0:15',
          createdAt: data.createdAt
        });
      });
      setPosts(fetched);
      if (fetched.length > 0 && !playingVideoId) {
        setPlayingVideoId(fetched[0].id);
      }
      setIsLoading(false);
      setShowRulesBanner(false);
    }, (error) => {
      console.info('Firestore subscription notice for posts (rules check):', error?.message);
      setIsLoading(false);
      if (error?.message?.includes('Missing or insufficient permissions')) {
        setShowRulesBanner(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time Stories Subscription (24-hour stories)
  useEffect(() => {
    const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      const items: StoryItem[] = [];
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const exp = new Date(data.expiresAt || '').getTime();
        if (!exp || exp > now) {
          items.push({
            id: docSnap.id,
            userId: data.userId,
            username: data.username,
            userAvatar: data.userAvatar,
            isGoldVerified: Boolean(data.isGoldVerified),
            mediaUrl: data.mediaUrl,
            thumbnailUrl: data.thumbnailUrl,
            caption: data.caption,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt
          });
        }
      });
      setStories(items);
    }, () => {});
    return () => unsubscribe();
  }, []);

  // 4. Capture PWA beforeinstallprompt event
  useEffect(() => {
    const promptHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', promptHandler);
    return () => window.removeEventListener('beforeinstallprompt', promptHandler);
  }, []);

  // 5. Persistent Likes across Browser Reloads
  useEffect(() => {
    const key = currentUser ? `telapp_likes_${currentUser.uid}` : 'telapp_likes_guest';
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setLikedPostIds(new Set(JSON.parse(stored)));
      } else {
        setLikedPostIds(new Set());
      }
    } catch {
      setLikedPostIds(new Set());
    }
  }, [currentUser]);

  // Real-time Like Handler with Atomic Increment & Double-Tap Heart Burst
  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const isCurrentlyLiked = likedPostIds.has(post.id);
    const newLiked = new Set(likedPostIds);

    // Optimistic UI update
    if (isCurrentlyLiked) {
      newLiked.delete(post.id);
    } else {
      newLiked.add(post.id);
      // Trigger floating heart burst
      setHeartBurstPostId(post.id);
      setTimeout(() => setHeartBurstPostId(null), 900);
    }
    setLikedPostIds(newLiked);

    // Write to persistent storage immediately so reload preserves liked status
    const storageKey = currentUser ? `telapp_likes_${currentUser.uid}` : 'telapp_likes_guest';
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newLiked)));
    } catch {
      // Ignore
    }

    // Optimistically update post likesCount in state
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          likesCount: isCurrentlyLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1
        };
      }
      return p;
    }));

    try {
      const postRef = doc(db, 'posts', post.id);
      const likeDocRef = doc(db, 'posts', post.id, 'likes', currentUser.uid);

      if (isCurrentlyLiked) {
        await deleteDoc(likeDocRef);
        await updateDoc(postRef, {
          likesCount: increment(-1)
        });
      } else {
        await setDoc(likeDocRef, {
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
        await updateDoc(postRef, {
          likesCount: increment(1)
        });
      }
    } catch (err: any) {
      console.info('Like action maintained locally (rules notice):', err?.message);
    }
  };

  // Real-time Follow Handler
  const handleToggleFollow = async (targetUserId: string, targetUsername: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const isFollowing = followedUserIds.has(targetUserId);
    const nextSet = new Set(followedUserIds);

    if (isFollowing) {
      nextSet.delete(targetUserId);
      triggerToast(`Unfollowed @${targetUsername}`);
    } else {
      nextSet.add(targetUserId);
      triggerToast(`Following @${targetUsername} in real-time`);
    }
    setFollowedUserIds(nextSet);

    try {
      const followDocId = `${currentUser.uid}_${targetUserId}`;
      const followRef = doc(db, 'follows', followDocId);

      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(-1)
        });
      } else {
        await setDoc(followRef, {
          followerId: currentUser.uid,
          targetId: targetUserId,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(1)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'follows');
    }
  };

  // Bookmark / Save
  const handleToggleSave = (postId: string) => {
    const nextSaved = new Set(savedPostIds);
    if (nextSaved.has(postId)) {
      nextSaved.delete(postId);
      triggerToast('Removed from Saved');
    } else {
      nextSaved.add(postId);
      triggerToast('Saved to your private collection');
    }
    setSavedPostIds(nextSaved);
  };

  // Filtered Posts for Discovery Engine
  const filteredPosts = posts.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.tags.includes(selectedCategory);
    const matchSearch = !searchQuery || 
      p.caption.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#06050b] text-[#ffffff] flex flex-col items-center select-none font-sans">
      
      {/* ===================================================================
          TELAPP MOBILE STREAMING VIEWPORT
          Instagram-style Real App with Firestore Live Sync & Gold Badge
          =================================================================== */}
      <div className="relative w-full max-w-[440px] min-h-screen md:min-h-[880px] md:my-6 md:rounded-[40px] bg-[#0b0914] border border-[#a29bfe]/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        
        {/* =================================================================
            TOP APP HEADER
            Instagram-Style: 3D App Icon + Brand Logo + Creator Actions + Direct Messages
            ================================================================= */}
        <header className="sticky top-0 z-40 h-14 px-4 bg-[#120e24]/90 backdrop-blur-xl border-b border-[#a29bfe]/15 flex items-center justify-between">
          
          {/* Logo & 3D App Icon & Gold Status */}
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/image_23f1ad3d.png"
              alt="TelApp Official App Icon"
              className="w-8 h-8 rounded-full object-cover shadow-[0_0_12px_rgba(108,92,231,0.6)] border border-[#a29bfe]/30 cursor-pointer gpu-tap"
              onClick={() => setActiveTab('feed')}
            />
            <span 
              onClick={() => setActiveTab('feed')}
              className="text-xl font-black tracking-tight bg-gradient-to-r from-[#6c5ce7] via-[#a29bfe] to-[#e84393] bg-clip-text text-transparent cursor-pointer"
            >
              TelApp
            </span>
            {currentUser?.isGoldVerified && <GoldBadge size="sm" showTooltip={true} />}
          </div>

          {/* Right Header Cluster: Search, Notifications, Direct Chat, Settings */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('discovery')}
              className="w-8 h-8 rounded-full bg-[#16122c] border border-[#a29bfe]/15 flex items-center justify-center text-white gpu-tap"
              aria-label="Search discovery"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Direct Message Chat Button with Real-Time Indicator */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setIsAuthOpen(true);
                } else {
                  setChatTargetUser(null);
                  setIsChatOpen(true);
                }
              }}
              className="relative w-8 h-8 rounded-full bg-[#16122c] border border-[#a29bfe]/15 flex items-center justify-center text-white gpu-tap"
              aria-label="Direct messages"
            >
              <Send className="w-3.5 h-3.5 -rotate-12 text-[#a29bfe]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff4757] border-2 border-[#0b0914] animate-pulse"></span>
            </button>

            {/* User Profile & Account Center Switcher */}
            {currentUser ? (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => setIsAccountCenterOpen(true)}
                  className="w-8 h-8 rounded-full bg-[#16122c] border border-[#a29bfe]/20 text-[#a29bfe] hover:text-white flex items-center justify-center gpu-tap"
                  title="Account Center & Switch Account"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`p-0.5 rounded-full flex-shrink-0 gpu-tap ${
                    currentUser.isGoldVerified ? 'ring-2 ring-[#ffd700]' : 'ring-1 ring-[#a29bfe]/40'
                  }`}
                  title={`Signed in as @${currentUser.username}`}
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold flex items-center gap-1 gpu-tap ml-1 shadow-md shadow-[#6c5ce7]/30"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Firestore Rules Helper Notification Banner */}
        {showRulesBanner && (
          <div className="bg-[#ffa502]/15 border-b border-[#ffa502]/30 px-3 py-1.5 flex items-center justify-between text-[11px] text-[#ffa502] z-30">
            <span className="truncate mr-2">
              ⚡ <b>telapptz</b> Firestore rules locked. Live local fallback active.
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowRulesModal(true)}
                className="underline font-bold text-white hover:text-[#ffa502]"
              >
                Fix in 1-Click
              </button>
              <button 
                onClick={() => setShowRulesBanner(false)}
                className="text-[#ffa502] hover:text-white"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW 1: INSTAGRAM-STYLE REAL-TIME FEED (activeTab === 'feed')
            ================================================================= */}
        {activeTab === 'feed' && (
          <div className="flex-1 pb-20 overflow-y-auto no-scrollbar">
            
            {/* Horizontal Stories Tray */}
            <div className="px-3 py-3 border-b border-[#a29bfe]/15 flex items-center gap-3 overflow-x-auto no-scrollbar">
              
              {/* Add Story Button */}
              <div 
                onClick={() => currentUser ? setIsCreateStoryOpen(true) : setIsAuthOpen(true)}
                className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 gpu-tap"
              >
                <div className="relative w-15 h-15 rounded-full p-[2px] border-2 border-dashed border-[#e84393] flex items-center justify-center">
                  <img
                    src={currentUser?.avatar || '/assets/aistudio/image_23f1ad3d.png'}
                    alt="Your avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white flex items-center justify-center border-2 border-[#0b0914] shadow-md">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="text-[10px] text-[#8b85b1] font-bold">Add Story</span>
              </div>

              {/* Real Active 24h Stories */}
              {stories.length > 0 ? (
                stories.map((st, sIndex) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      setActiveStoryIndex(sIndex);
                      setIsStoryViewerOpen(true);
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 gpu-tap"
                  >
                    <div className={`w-15 h-15 rounded-full p-[2.5px] ${
                      st.isGoldVerified 
                        ? 'bg-gradient-to-tr from-[#ffd700] via-[#ffc048] to-[#ffa502] shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                        : 'bg-gradient-to-tr from-[#6c5ce7] via-[#e84393] to-[#ffa502]'
                    }`}>
                      <img
                        src={st.userAvatar}
                        alt={st.username}
                        className="w-full h-full rounded-full object-cover border-2 border-[#0b0914]"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 max-w-[64px]">
                      <span className="text-[10px] text-[#e2e0f0] truncate">@{st.username}</span>
                      {st.isGoldVerified && <GoldBadge size="sm" showTooltip={false} />}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback Creators Reel Tray if no direct 24h stories uploaded yet */
                Array.from(
                  new Map(
                    posts.map(p => [p.userId, { uid: p.userId, name: p.username, avatar: p.userAvatar, isGold: p.isGoldVerified, postId: p.id, post: p }])
                  ).values()
                ).map(st => (
                  <div
                    key={st.uid}
                    onClick={() => {
                      setPlayingVideoId(st.postId);
                      triggerToast(`Viewing reel from @${st.name}`);
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 gpu-tap"
                  >
                    <div className={`w-15 h-15 rounded-full p-[2.5px] ${
                      st.isGold 
                        ? 'bg-gradient-to-tr from-[#ffd700] via-[#fbbf24] to-[#fef08a] shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                        : 'bg-gradient-to-tr from-[#6c5ce7] via-[#e84393] to-[#ffa502]'
                    }`}>
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="w-full h-full rounded-full object-cover border-2 border-[#0b0914]"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 max-w-[64px]">
                      <span className="text-[10px] text-[#e2e0f0] truncate">@{st.name}</span>
                      {st.isGold && <GoldBadge size="sm" showTooltip={false} />}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Posts / Reels List */}
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2].map(n => (
                  <div key={n} className="rounded-3xl bg-[#16122c] aspect-[9/13] skeleton-shimmer"></div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#8b85b1] text-center px-4 gap-3">
                <Tv className="w-12 h-12 opacity-30 text-[#a29bfe]" />
                <h3 className="text-sm font-bold text-white">No Reels Yet</h3>
                <p className="text-xs text-[#8b85b1]">Be the first to publish a high-definition reel post!</p>
                <button
                  onClick={() => currentUser ? setIsCreateOpen(true) : setIsAuthOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold gpu-tap shadow-lg"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#a29bfe]/15">
                {posts.map(post => {
                  const isPostLiked = likedPostIds.has(post.id);
                  const isPostSaved = savedPostIds.has(post.id);
                  const isAuthorFollowed = followedUserIds.has(post.userId);

                  return (
                    <article key={post.id} className="py-3 flex flex-col bg-[#0b0914]">
                      
                      {/* Post Header: User info, Gold verification badge, Follow button */}
                      <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={post.userAvatar}
                            alt={post.username}
                            className="w-9 h-9 rounded-full object-cover border border-[#6c5ce7] flex-shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                @{post.username}
                              </span>
                              {post.isGoldVerified && <GoldBadge size="sm" />}
                            </div>
                            <span className="text-[10px] text-[#8b85b1] flex items-center gap-1">
                              <Music className="w-2.5 h-2.5 text-[#e84393]" />
                              <span className="truncate max-w-[140px]">{post.audioTrack}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentUser?.uid !== post.userId && (
                            <button
                              onClick={() => handleToggleFollow(post.userId, post.username)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all gpu-tap ${
                                isAuthorFollowed
                                  ? 'bg-[#211c42] border border-[#a29bfe]/20 text-[#8b85b1]'
                                  : 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white shadow-sm'
                              }`}
                            >
                              {isAuthorFollowed ? 'Following' : 'Follow'}
                            </button>
                          )}
                          {currentUser?.uid !== post.userId && (
                            <button
                              onClick={() => {
                                if (!currentUser) {
                                  setIsAuthOpen(true);
                                } else {
                                  setChatTargetUser({
                                    uid: post.userId,
                                    username: post.username,
                                    avatar: post.userAvatar,
                                    isGoldVerified: post.isGoldVerified
                                  });
                                  setIsChatOpen(true);
                                }
                              }}
                              className="p-1.5 rounded-full bg-[#16122c] border border-[#a29bfe]/20 text-[#a29bfe] hover:text-white gpu-tap"
                              title={`Direct message @${post.username}`}
                            >
                              <Send className="w-3.5 h-3.5 -rotate-12" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (currentUser?.uid === post.userId) {
                                setActiveEditPost(post);
                              } else {
                                setActiveShareTarget({
                                  type: 'reel',
                                  id: post.id,
                                  username: post.username,
                                  title: post.caption,
                                  thumbnailUrl: post.thumbnailUrl
                                });
                                setActiveSharePost(post);
                              }
                            }}
                            className="text-[#8b85b1] hover:text-white p-1"
                            title={currentUser?.uid === post.userId ? "Edit / Delete Reel" : "Share Reel"}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Resilient Video Player Media Container with Graceful Fallback & Double-Tap Like Burst */}
                      <div 
                        className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center cursor-pointer group"
                      >
                        <MediaDisplay
                          videoUrl={post.videoUrl}
                          thumbnailUrl={post.thumbnailUrl}
                          caption={post.caption}
                          username={post.username}
                          audioTrack={post.audioTrack}
                          isPlaying={playingVideoId === post.id}
                          isMuted={isMuted}
                          onClick={() => setPlayingVideoId(playingVideoId === post.id ? null : post.id)}
                          onDoubleTap={() => handleToggleLike(post)}
                          className="w-full h-full"
                        />

                        {/* Double-tap floating heart pop effect */}
                        {heartBurstPostId === post.id && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-ping">
                            <Heart className="w-20 h-20 text-[#ff4757] fill-[#ff4757] drop-shadow-[0_0_20px_rgba(255,71,87,0.8)]" />
                          </div>
                        )}

                        {/* Video Controls Overlay */}
                        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMuted(!isMuted);
                            }}
                            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white gpu-tap"
                            aria-label={isMuted ? "Unmute video" : "Mute video"}
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#2ed573]" />}
                          </button>
                          <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                            {post.duration}
                          </span>
                        </div>

                        {/* Live Indicator if tagged */}
                        {post.tags.includes('Live Streams') && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#ff4757] text-[9px] font-bold text-white flex items-center gap-1 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Action Engagement Row: Like, Comment, Share, Save */}
                      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          
                          {/* Like Button with Real-time Count */}
                          <button
                            onClick={() => handleToggleLike(post)}
                            className="flex items-center gap-1.5 text-white gpu-tap"
                            aria-label={`Like post, ${post.likesCount} likes`}
                          >
                            <Heart
                              className={`w-6 h-6 transition-transform ${
                                isPostLiked
                                  ? 'fill-[#ff4757] text-[#ff4757] scale-110 drop-shadow-[0_0_8px_rgba(255,71,87,0.5)]'
                                  : 'text-white hover:text-[#ff4757]'
                              }`}
                            />
                            <span className="text-xs font-bold">
                              {post.likesCount.toLocaleString()}
                            </span>
                          </button>

                          {/* Comment Button with Real-time Count */}
                          <button
                            onClick={() => setActiveCommentsPostId(post.id)}
                            className="flex items-center gap-1.5 text-white gpu-tap"
                            aria-label={`View ${post.commentsCount} comments`}
                          >
                            <MessageCircle className="w-6 h-6 hover:text-[#6c5ce7]" />
                            <span className="text-xs font-bold">
                              {post.commentsCount.toLocaleString()}
                            </span>
                          </button>

                          {/* Share Button (triggers Social Media Share Sheet) */}
                          <button
                            onClick={() => setActiveSharePost(post)}
                            className="text-white hover:text-[#e84393] gpu-tap"
                            aria-label="Share reel to WhatsApp, Twitter, or apps"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Bookmark / Save */}
                        <button
                          onClick={() => handleToggleSave(post.id)}
                          className="text-white hover:text-[#ffa502] gpu-tap"
                          aria-label="Save post"
                        >
                          <Bookmark
                            className={`w-5 h-5 ${
                              isPostSaved ? 'fill-[#ffa502] text-[#ffa502]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Caption & Metadata Safe Region */}
                      <div className="px-4 py-1 flex flex-col gap-1 text-left">
                        <div className="text-xs text-white leading-relaxed">
                          <span className="font-bold mr-1.5">@{post.username}</span>
                          <span className="text-[#e2e0f0]">{post.caption}</span>
                        </div>

                        {/* Hashtags */}
                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                          {post.tags.map(t => (
                            <span
                              key={t}
                              onClick={() => {
                                setSelectedCategory(t);
                                setActiveTab('discovery');
                              }}
                              className="text-[11px] font-semibold text-[#a29bfe] cursor-pointer hover:underline"
                            >
                              #{t.toLowerCase().replace(/\s+/g, '')}
                            </span>
                          ))}
                        </div>

                        {/* View all comments preview trigger */}
                        {post.commentsCount > 0 && (
                          <button
                            onClick={() => setActiveCommentsPostId(post.id)}
                            className="text-[11px] text-[#8b85b1] hover:text-white mt-0.5 self-start"
                          >
                            View all {post.commentsCount} comments
                          </button>
                        )}
                      </div>

                    </article>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =================================================================
            VIEW 2: DISCOVERY ENGINE / EXPLORE (activeTab === 'discovery')
            ================================================================= */}
        {activeTab === 'discovery' && (
          <div className="flex-1 pb-20 overflow-y-auto no-scrollbar">
            
            {/* Search Input Bar */}
            <div className="p-3 sticky top-0 z-30 bg-[#0b0914]/90 backdrop-blur-md">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#8b85b1] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creators, #hashtags, audio..."
                  className="w-full bg-[#16122c] border border-[#a29bfe]/20 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-[#8b85b1] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Horizontally Scrollable Category Filter Pills (Scroll Snap) */}
            <nav
              className="flex gap-2 px-3 py-1 overflow-x-auto no-scrollbar"
              style={{ scrollSnapType: 'x mandatory' }}
              aria-label="Categories"
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{ scrollSnapAlign: 'start' }}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 gpu-tap ${
                      isActive
                        ? 'text-white border-transparent bg-gradient-to-r from-[#6c5ce7] to-[#e84393] shadow-[0_4px_12px_rgba(108,92,231,0.4)]'
                        : 'text-[#8b85b1] bg-[#16122c] border-[#a29bfe]/15 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </nav>

            {/* Asymmetric / High-density Media Grid */}
            {filteredPosts.length === 0 ? (
              <div className="py-20 px-4 flex flex-col items-center justify-center text-center text-[#8b85b1] gap-3">
                <Search className="w-12 h-12 opacity-30 text-[#a29bfe]" />
                <h3 className="text-sm font-bold text-white">No Reels Found</h3>
                <p className="text-xs text-[#8b85b1] max-w-[240px]">
                  {searchQuery 
                    ? `No reels match "${searchQuery}". Try another search term.` 
                    : `No reels uploaded in "${selectedCategory}" yet.`}
                </p>
                <button
                  onClick={() => currentUser ? setIsCreateOpen(true) : setIsAuthOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold gpu-tap shadow-lg"
                >
                  Upload First Reel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setActiveTab('feed');
                      setPlayingVideoId(post.id);
                    }}
                    className="relative rounded-2xl overflow-hidden aspect-[9/13] bg-[#16122c] border border-[#a29bfe]/15 group cursor-pointer gpu-tap"
                  >
                    <MediaDisplay
                      videoUrl={post.videoUrl}
                      thumbnailUrl={post.thumbnailUrl}
                      caption={post.caption}
                      username={post.username}
                      audioTrack={post.audioTrack}
                      isPlaying={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                    {/* Absolute Duration Badge */}
                    <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      {post.duration}
                    </span>

                    {/* Top Creator Info */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                          @{post.username}
                        </span>
                        {post.isGoldVerified && <GoldBadge size="sm" />}
                      </div>
                      <span className="text-[10px] text-[#2ed573] font-bold flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5 fill-[#ff4757] text-[#ff4757]" />
                        {post.likesCount > 1000 ? `${(post.likesCount / 1000).toFixed(1)}K` : post.likesCount}
                      </span>
                    </div>

                    {/* Safe Region Title */}
                    <div className="absolute bottom-2 left-2 right-12 text-left">
                      <p className="text-[11px] text-white font-medium line-clamp-1 leading-snug">
                        {post.caption}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* =================================================================
            VIEW 3: CURATED SPOTLIGHT PREMIERE (activeTab === 'spotlight')
            ================================================================= */}
        {activeTab === 'spotlight' && (
          <div className="flex-1 pb-20 overflow-y-auto no-scrollbar">
            
            {posts.length === 0 ? (
              <div className="py-28 px-6 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#16122c] border border-[#ffd700]/30 flex items-center justify-center text-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">No Spotlight Premieres Yet</h2>
                  <p className="text-xs text-[#8b85b1] mt-1 max-w-[260px]">
                    Upload your video reel to get spotlighted on the premiere stage of TelApp.
                  </p>
                </div>
                <button
                  onClick={() => currentUser ? setIsCreateOpen(true) : setIsAuthOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold gpu-tap shadow-lg shadow-[#6c5ce7]/30"
                >
                  Publish First Premiere
                </button>
              </div>
            ) : (() => {
              const spotlightPost = posts.reduce((prev, curr) => (curr.likesCount > prev.likesCount ? curr : prev), posts[0]);
              return (
                <>
                  {/* Spotlight Container with Real Post Data */}
                  <div className="relative w-full min-h-[460px] flex flex-col justify-end p-5 overflow-hidden bg-[#16122c]">
                    <MediaDisplay
                      videoUrl={spotlightPost.videoUrl}
                      thumbnailUrl={spotlightPost.thumbnailUrl}
                      caption={spotlightPost.caption}
                      username={spotlightPost.username}
                      audioTrack={spotlightPost.audioTrack}
                      isPlaying={playingVideoId === spotlightPost.id}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0914] via-[#0b0914]/80 to-transparent"></div>

                    <div className="relative z-10 flex flex-col gap-3 text-left">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
                          Featured Premiere
                        </span>
                        {spotlightPost.isGoldVerified && <GoldBadge size="sm" />}
                      </div>

                      {/* Title with Heavy Shadow Mask */}
                      <h1 
                        className="text-2xl font-black text-white leading-tight line-clamp-2"
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 6px 16px rgba(0,0,0,0.95), 0 12px 30px rgba(11,9,20,0.98)'
                        }}
                      >
                        {spotlightPost.caption}
                      </h1>

                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#a29bfe]">
                        <span className="px-2 py-0.5 rounded bg-[#16122c]/90 border border-[#a29bfe]/20 text-white">
                          @{spotlightPost.username}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#16122c]/90 border border-[#a29bfe]/20 text-white">
                          {spotlightPost.duration}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#16122c]/90 border border-[#a29bfe]/20 text-white">
                          {spotlightPost.likesCount} Likes
                        </span>
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex items-center gap-2.5 mt-1">
                        <button
                          onClick={() => {
                            setActiveTab('feed');
                            setPlayingVideoId(spotlightPost.id);
                            triggerToast(`Streaming @${spotlightPost.username}'s reel`);
                          }}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/40 gpu-tap"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Watch Reel</span>
                        </button>
                        <button
                          onClick={() => setActiveSharePost(spotlightPost)}
                          className="p-3 rounded-xl bg-[#16122c]/80 border border-[#a29bfe]/30 text-white gpu-tap"
                          aria-label="Share Premiere"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Curated Real Reels Rail */}
                  <div className="p-4 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#ffd700]" />
                        <span>All Community Reels</span>
                      </h3>
                      <span className="text-xs text-[#a29bfe] font-medium">{posts.length} uploaded</span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      {posts.map(p => (
                        <div
                          key={`curated-${p.id}`}
                          onClick={() => {
                            setActiveTab('feed');
                            setPlayingVideoId(p.id);
                          }}
                          className="w-36 flex-shrink-0 rounded-2xl overflow-hidden bg-[#16122c] border border-[#a29bfe]/20 cursor-pointer gpu-tap"
                        >
                          <div className="relative aspect-[2/3]">
                            <img src={p.thumbnailUrl} alt={p.caption} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[9px] text-white">
                              {p.duration}
                            </span>
                          </div>
                          <div className="p-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-white truncate">@{p.username}</span>
                              {p.isGoldVerified && <GoldBadge size="sm" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

          </div>
        )}

        {/* =================================================================
            VIEW 4: USER PROFILE & SETTINGS (activeTab === 'profile')
            ================================================================= */}
        {activeTab === 'profile' && (
          <div className="flex-1 pb-20 overflow-y-auto no-scrollbar text-left">
            
            {currentUser ? (
              <div className="p-4 space-y-4">
                
                {/* Profile Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-bold text-white">@{currentUser.username}</h2>
                    {currentUser.isGoldVerified && <GoldBadge size="md" />}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16122c] border border-[#a29bfe]/20 text-[#a29bfe] flex items-center gap-1">
                      {currentUser.isPrivate ? <Lock className="w-2.5 h-2.5 text-[#ffd700]" /> : <Globe className="w-2.5 h-2.5 text-[#2ed573]" />}
                      <span>{currentUser.isPrivate ? 'Private' : 'Public'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsAccountCenterOpen(true)}
                      className="p-2 rounded-full bg-[#16122c] border border-[#a29bfe]/20 text-[#a29bfe] hover:text-white gpu-tap"
                      title="Account Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        fbSignOut(auth);
                        setCurrentUser(null);
                        triggerToast('Signed out successfully');
                      }}
                      className="p-2 rounded-full bg-[#16122c] border border-[#a29bfe]/20 text-[#8b85b1] hover:text-[#ff4757] gpu-tap"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Gold Verification Status Card */}
                {currentUser.isGoldVerified ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#ffd700]/15 via-[#ffc048]/10 to-[#ffa502]/15 border border-[#ffd700]/40 shadow-[0_0_20px_rgba(255,215,0,0.15)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ffd700] to-[#ffa502] flex items-center justify-center text-[#0b0914] shadow-md">
                        <Crown className="w-5 h-5 fill-[#0b0914]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">VIP Gold Verified Creator</span>
                          <GoldBadge size="sm" />
                        </div>
                        <span className="text-[10px] text-[#ffd700]">Unlimited post edits & priority placement active</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0b0914] to-[#16122c] border border-[#ffd700]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#211c42] border border-[#ffd700]/30 flex items-center justify-center text-[#ffd700]">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Standard Free Account</span>
                        <span className="text-[10px] text-[#8b85b1]">Get Gold badge & unlimited edits for 2,000 TSh</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsVerifyOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ffa502] text-[#0b0914] text-[11px] font-bold shadow-md hover:scale-105 transition-all"
                    >
                      Get Verified (2,000 TSh)
                    </button>
                  </div>
                )}

                {/* Avatar and Metric Counts */}
                <div className="flex items-center gap-6">
                  <div className={`relative w-20 h-20 rounded-full p-[3px] flex-shrink-0 ${
                    currentUser.isGoldVerified
                      ? 'bg-gradient-to-tr from-[#b45309] via-[#fbbf24] to-[#fef08a] shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                      : 'bg-gradient-to-tr from-[#6c5ce7] to-[#e84393]'
                  }`}>
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="w-full h-full rounded-full object-cover border-2 border-[#0b0914]"
                    />
                  </div>

                  <div className="flex-1 flex items-center justify-around text-center">
                    <div>
                      <span className="block text-sm font-bold text-white">{currentUser.postsCount}</span>
                      <span className="text-[11px] text-[#8b85b1]">Posts</span>
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white">{currentUser.followersCount.toLocaleString()}</span>
                      <span className="text-[11px] text-[#8b85b1]">Followers</span>
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white">{currentUser.followingCount}</span>
                      <span className="text-[11px] text-[#8b85b1]">Following</span>
                    </div>
                  </div>
                </div>

                {/* Bio & Details */}
                <div>
                  <h3 className="text-xs font-bold text-white">{currentUser.displayName}</h3>
                  <p className="text-xs text-[#e2e0f0] mt-0.5">{currentUser.bio}</p>
                  <span className="text-[10px] text-[#a29bfe] font-mono mt-1 block">
                    {currentUser.email}
                  </span>
                </div>

                {/* Profile Actions: Upload Reel, Add Story, Account Center */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="py-2 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md gpu-tap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Reel</span>
                  </button>
                  <button
                    onClick={() => setIsCreateStoryOpen(true)}
                    className="py-2 rounded-xl bg-[#211c42] border border-[#e84393]/40 text-white text-[11px] font-semibold flex items-center justify-center gap-1 gpu-tap"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#e84393]" />
                    <span>Add Story</span>
                  </button>
                  <button
                    onClick={() => setIsAccountCenterOpen(true)}
                    className="py-2 rounded-xl bg-[#16122c] border border-[#a29bfe]/20 text-white text-[11px] font-semibold flex items-center justify-center gap-1 gpu-tap"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#a29bfe]" />
                    <span>Accounts</span>
                  </button>
                </div>

                {/* User's Uploaded Posts Grid */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider block mb-2">
                    My Published Streams ({posts.filter(p => p.userId === currentUser.uid).length})
                  </span>
                  {posts.filter(p => p.userId === currentUser.uid).length === 0 ? (
                    <div className="py-8 text-center bg-[#0b0914] rounded-2xl border border-[#a29bfe]/15 p-4 flex flex-col items-center justify-center gap-2">
                      <Tv className="w-8 h-8 opacity-30 text-[#a29bfe]" />
                      <p className="text-xs font-medium text-white">No reels uploaded yet</p>
                      <p className="text-[11px] text-[#8b85b1]">Share your first video with the community.</p>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-[11px] font-bold"
                      >
                        Upload Reel
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {posts.filter(p => p.userId === currentUser.uid).map(myPost => (
                        <div
                          key={myPost.id}
                          onClick={() => {
                            setActiveTab('feed');
                            setPlayingVideoId(myPost.id);
                          }}
                          className="relative aspect-square rounded-xl overflow-hidden bg-[#16122c] cursor-pointer gpu-tap group"
                        >
                          <MediaDisplay
                            videoUrl={myPost.videoUrl}
                            thumbnailUrl={myPost.thumbnailUrl}
                            caption={myPost.caption}
                            username={myPost.username}
                            isPlaying={false}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 text-[9px] text-white bg-black/70 px-1 rounded z-10">
                            {myPost.likesCount} ♥
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#16122c] border border-[#a29bfe]/20 flex items-center justify-center text-[#a29bfe]">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Join the TelApp Community</h3>
                  <p className="text-xs text-[#8b85b1] mt-1 max-w-[240px]">
                    Sign in with email to claim your standard unique username and stream live.
                  </p>
                </div>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 gpu-tap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In or Create Account</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* =================================================================
            FIXED BOTTOM APPLICATION BAR (ASYMMETRIC FLOATING '+' ACTION)
            ================================================================= */}
        <nav
          className="fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto h-16 bg-[#120e24]/90 backdrop-blur-2xl border-t border-[#a29bfe]/15 flex items-center justify-around px-2 z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
          aria-label="Navigation Bar"
        >
          {/* Feed */}
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[54px] py-1 text-[10px] font-semibold gpu-tap ${
              activeTab === 'feed' ? 'text-white' : 'text-[#8b85b1]'
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === 'feed' ? 'text-[#a29bfe]' : ''}`} />
            <span>Feed</span>
            {activeTab === 'feed' && <span className="w-1 h-1 rounded-full bg-[#6c5ce7]"></span>}
          </button>

          {/* Explore / Discovery */}
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[54px] py-1 text-[10px] font-semibold gpu-tap ${
              activeTab === 'discovery' ? 'text-white' : 'text-[#8b85b1]'
            }`}
          >
            <Search className={`w-5 h-5 ${activeTab === 'discovery' ? 'text-[#a29bfe]' : ''}`} />
            <span>Explore</span>
            {activeTab === 'discovery' && <span className="w-1 h-1 rounded-full bg-[#6c5ce7]"></span>}
          </button>

          {/* Asymmetric Floating '+' Circular Hub Action */}
          <div className="relative -top-4 flex items-center justify-center">
            <button
              onClick={() => {
                if (!currentUser) {
                  setIsAuthOpen(true);
                } else {
                  setIsCreateOpen(true);
                }
              }}
              className="w-13 h-13 rounded-full bg-gradient-to-r from-[#6c5ce7] via-[#a29bfe] to-[#e84393] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(108,92,231,0.5)] border-4 border-[#0b0914] gpu-tap hover:scale-105"
              aria-label="Create new reel"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Spotlight Premiere */}
          <button
            onClick={() => setActiveTab('spotlight')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[54px] py-1 text-[10px] font-semibold gpu-tap ${
              activeTab === 'spotlight' ? 'text-white' : 'text-[#8b85b1]'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${activeTab === 'spotlight' ? 'text-[#ffd700]' : ''}`} />
            <span>Spotlight</span>
            {activeTab === 'spotlight' && <span className="w-1 h-1 rounded-full bg-[#ffd700]"></span>}
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[54px] py-1 text-[10px] font-semibold gpu-tap ${
              activeTab === 'profile' ? 'text-white' : 'text-[#8b85b1]'
            }`}
          >
            <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#a29bfe]' : ''}`} />
            <span>Profile</span>
            {activeTab === 'profile' && <span className="w-1 h-1 rounded-full bg-[#6c5ce7]"></span>}
          </button>
        </nav>

      </div>

      {/* ===================================================================
          MODALS & SYSTEM OVERLAYS
          =================================================================== */}
      
      {/* 1. Email Auth & Unique Username Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          triggerToast(`Welcome @${profile.username}! Account active.`);
        }}
      />

      {/* 2. Gold Verification Paywall & Activation Code Modal (2,000 TSh) */}
      {currentUser && (
        <VerifyModal
          isOpen={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
          currentUser={currentUser}
          onVerificationSuccess={(updated) => {
            setCurrentUser(updated);
            saveAccountToSessions(updated);
            triggerToast('Account Gold Verified successfully!');
          }}
        />
      )}

      {/* 3. Account Center & Multi-Account Switcher Modal */}
      {currentUser && (
        <AccountCenterModal
          isOpen={isAccountCenterOpen}
          onClose={() => setIsAccountCenterOpen(false)}
          currentUser={currentUser}
          onUpdateProfile={(updated) => {
            setCurrentUser(updated);
            triggerToast('Profile updated');
          }}
          onOpenVerifyModal={() => setIsVerifyOpen(true)}
          onSwitchAccount={(account) => {
            setCurrentUser(account);
            triggerToast(`Switched account to @${account.username}`);
          }}
          onAddNewAccount={() => setIsAuthOpen(true)}
          onSignOut={() => {
            fbSignOut(auth);
            setCurrentUser(null);
            triggerToast('Signed out');
          }}
          deferredPrompt={deferredPrompt}
        />
      )}

      {/* 4. Edit Post Modal (with 24h limit for standard & unlimited for gold) */}
      {currentUser && (
        <EditPostModal
          post={activeEditPost}
          isOpen={Boolean(activeEditPost)}
          onClose={() => setActiveEditPost(null)}
          currentUser={currentUser}
          onPostUpdated={(updated) => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
            triggerToast('Post updated successfully');
          }}
          onPostDeleted={(postId) => {
            setPosts(prev => prev.filter(p => p.id !== postId));
            triggerToast('Post deleted');
          }}
          onOpenVerifyModal={() => setIsVerifyOpen(true)}
        />
      )}

      {/* 5. Create / Upload Reel Post Modal */}
      {currentUser && (
        <CreatePostModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          currentUser={currentUser}
          onPostCreated={() => {
            triggerToast('Reel published to live feed in real-time!');
            setActiveTab('feed');
          }}
        />
      )}

      {/* 6. Create Story Modal (24h Expiring Story) */}
      {currentUser && (
        <CreateStoryModal
          isOpen={isCreateStoryOpen}
          onClose={() => setIsCreateStoryOpen(false)}
          currentUser={currentUser}
          onStoryCreated={(story) => {
            setStories(prev => [story, ...prev]);
            triggerToast('Story shared for 24 hours!');
          }}
        />
      )}

      {/* 7. Full-Screen Story Viewer Modal */}
      <StoryViewerModal
        stories={stories.length > 0 ? stories : posts.slice(0, 5).map(p => ({
          id: `story_from_post_${p.id}`,
          userId: p.userId,
          username: p.username,
          userAvatar: p.userAvatar,
          isGoldVerified: p.isGoldVerified,
          mediaUrl: p.videoUrl,
          thumbnailUrl: p.thumbnailUrl,
          caption: p.caption,
          createdAt: p.createdAt,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        }))}
        initialIndex={activeStoryIndex}
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        onShareStory={(st) => {
          setActiveShareTarget({
            type: 'story',
            id: st.id,
            username: st.username,
            title: st.caption,
            thumbnailUrl: st.thumbnailUrl
          });
          setActiveSharePost(null);
        }}
      />

      {/* 8. Real-Time Social Media Share Modal with Masked Secret Link */}
      <ShareModal
        post={activeSharePost}
        shareTarget={activeShareTarget}
        isOpen={Boolean(activeSharePost || activeShareTarget)}
        onClose={() => {
          setActiveSharePost(null);
          setActiveShareTarget(null);
        }}
        onShareCompleted={(platform) => {
          triggerToast(`Shared via ${platform}`);
        }}
      />

      {/* 9. Real-Time Comments Modal */}
      {activeCommentsPostId && (
        <CommentsModal
          postId={activeCommentsPostId}
          isOpen={Boolean(activeCommentsPostId)}
          onClose={() => setActiveCommentsPostId(null)}
          currentUser={currentUser}
          onRequireAuth={() => setIsAuthOpen(true)}
        />
      )}

      {/* 10. Real-Time Direct Message Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        targetUser={chatTargetUser}
      />

      {/* Instant Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 z-50 bg-[#16122c]/95 border border-[#6c5ce7] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-[#2ed573]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 11. Firestore Rules Guidance Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16122c] border border-[#ffd700]/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#a29bfe]/15">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h3 className="text-sm font-bold text-white">Enable Cloud Sync for telapptz</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-7 h-7 rounded-full bg-[#0b0914] flex items-center justify-center text-[#8b85b1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8b85b1]">
              Your project <b>telapptz</b> is in default locked mode. To enable cloud database sync:
            </p>

            <div className="bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl p-2.5 font-mono text-[10px] text-[#2ed573] space-y-1">
              <div>rules_version = '2';</div>
              <div>service cloud.firestore &#123;</div>
              <div className="pl-2">match /databases/&#123;database&#125;/documents &#123;</div>
              <div className="pl-4">match /&#123;document=**&#125; &#123; allow read, write: if true; &#125;</div>
              <div className="pl-2">&#125;</div>
              <div>&#125;</div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`
                  );
                  triggerToast('Rules copied! Paste into Firebase Console');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold flex items-center justify-center gap-1.5 gpu-tap"
              >
                <span>Copy 1-Click Firestore Rule</span>
              </button>

              <a
                href="https://console.firebase.google.com/project/telapptz/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-[#211c42] border border-[#a29bfe]/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#6c5ce7] transition-colors"
              >
                <span>Open Firebase Console Rules</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
