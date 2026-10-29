import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, CheckCheck, Search, User as UserIcon } from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  limit,
  getDocs
} from 'firebase/firestore';
import { db, ChatMessageItem, UserProfile } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  targetUser: {
    uid: string;
    username: string;
    avatar: string;
    isGoldVerified: boolean;
  } | null;
  onSelectTargetUser?: (user: { uid: string; username: string; avatar: string; isGoldVerified: boolean }) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  onSelectTargetUser
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [activeChatTarget, setActiveChatTarget] = useState<{
    uid: string;
    username: string;
    avatar: string;
    isGoldVerified: boolean;
  } | null>(targetUser);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync activeChatTarget if targetUser prop changes
  useEffect(() => {
    setActiveChatTarget(targetUser);
  }, [targetUser]);

  // Load real registered users for chat picker if no target user selected
  useEffect(() => {
    if (!isOpen || activeChatTarget) return;

    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(30)));
        const list: UserProfile[] = [];
        usersSnap.forEach(d => {
          const u = d.data() as UserProfile;
          if (u.uid !== currentUser?.uid) {
            list.push(u);
          }
        });
        setRealUsers(list);
      } catch (err) {
        console.info('User search notice:', err);
      }
    };

    fetchUsers();
  }, [isOpen, activeChatTarget, currentUser]);

  // Compute canonical conversation thread ID between two real users
  const conversationId = currentUser && activeChatTarget 
    ? [currentUser.uid, activeChatTarget.uid].sort().join('__')
    : 'community_channel';

  useEffect(() => {
    if (!isOpen || !activeChatTarget) return;

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(80));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessageItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.conversationId === conversationId) {
          msgs.push({
            id: docSnap.id,
            conversationId: data.conversationId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            receiverId: data.receiverId,
            text: data.text,
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'
          });
        }
      });
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }, (error) => {
      console.info('Direct messages onSnapshot notice:', error?.message);
      // Pure real mode: no fake messages
    });

    return () => unsubscribe();
  }, [isOpen, conversationId, activeChatTarget]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !activeChatTarget) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    // Optimistic UI update
    const optimisticMsg: ChatMessageItem = {
      id: `local_msg_${Date.now()}`,
      conversationId,
      senderId: currentUser.uid,
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: activeChatTarget.uid,
      text: textToSend,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        receiverId: activeChatTarget.uid,
        text: textToSend,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.info('Message cloud sync notice (kept in local session):', err?.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-[85vh] sm:h-[620px] bg-[#16122c] border border-[#a29bfe]/20 rounded-t-[28px] sm:rounded-[28px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[#a29bfe]/15 bg-[#120e24]">
          {activeChatTarget ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={activeChatTarget.avatar} 
                alt={activeChatTarget.username} 
                className="w-9 h-9 rounded-full object-cover border border-[#6c5ce7]"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    @{activeChatTarget.username}
                  </span>
                  {activeChatTarget.isGoldVerified && <GoldBadge size="sm" />}
                </div>
                <span className="text-[10px] text-[#2ed573] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ed573] animate-pulse"></span>
                  Active in real-time
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-[#6c5ce7]" />
              <span>Direct Messages</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {activeChatTarget && (
              <button
                onClick={() => setActiveChatTarget(null)}
                className="text-[11px] text-[#a29bfe] hover:underline"
              >
                Change User
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Picker Mode (when no target selected) */}
        {!activeChatTarget ? (
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar flex flex-col gap-3">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#8b85b1] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search username to chat..."
                className="w-full bg-[#0b0914] border border-[#a29bfe]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
              />
            </div>

            <span className="text-[10px] font-bold text-[#8b85b1] uppercase tracking-wider">
              Real Community Members
            </span>

            {realUsers.filter(u => !searchUserQuery || u.username.toLowerCase().includes(searchUserQuery.toLowerCase())).length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#8b85b1] gap-2">
                <UserIcon className="w-8 h-8 opacity-40 text-[#a29bfe]" />
                <p className="text-xs font-semibold text-white">No other users yet</p>
                <p className="text-[11px] text-[#8b85b1] max-w-[220px]">
                  When other real users create accounts or post, you can message them directly here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#a29bfe]/10">
                {realUsers
                  .filter(u => !searchUserQuery || u.username.toLowerCase().includes(searchUserQuery.toLowerCase()))
                  .map(u => (
                    <div
                      key={u.uid}
                      onClick={() => {
                        const target = {
                          uid: u.uid,
                          username: u.username,
                          avatar: u.avatar,
                          isGoldVerified: u.isGoldVerified
                        };
                        setActiveChatTarget(target);
                        if (onSelectTargetUser) onSelectTargetUser(target);
                      }}
                      className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#0b0914]/50 rounded-xl px-2 gpu-tap"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full object-cover border border-[#6c5ce7]" />
                        <div className="flex flex-col min-w-0 text-left">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white truncate">@{u.username}</span>
                            {u.isGoldVerified && <GoldBadge size="sm" />}
                          </div>
                          <span className="text-[10px] text-[#8b85b1] truncate">{u.displayName}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-[10px] font-bold">
                        Message
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#8b85b1] text-center gap-2">
                  <MessageSquare className="w-10 h-10 opacity-30 text-[#a29bfe]" />
                  <p className="text-xs font-semibold text-white">Direct Chat with @{activeChatTarget.username}</p>
                  <p className="text-[11px] text-[#8b85b1] max-w-[200px]">Send a live message to start chatting in real time.</p>
                </div>
              ) : (
                messages.map(m => {
                  const isMine = currentUser && m.senderId === currentUser.uid;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-1.5 max-w-[80%]">
                        {!isMine && (
                          <img 
                            src={m.senderAvatar} 
                            alt={m.senderName} 
                            className="w-6 h-6 rounded-full object-cover mb-1 border border-white/20"
                          />
                        )}
                        <div 
                          className={`p-3 rounded-2xl text-xs ${
                            isMine 
                              ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white rounded-br-none shadow-md' 
                              : 'bg-[#0b0914] border border-[#a29bfe]/15 text-[#e2e0f0] rounded-bl-none text-left'
                          }`}
                        >
                          {!isMine && (
                            <span className="block text-[10px] font-bold text-[#a29bfe] mb-0.5">
                              @{m.senderName}
                            </span>
                          )}
                          <p className="break-words">{m.text}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-[#8b85b1]">
                        <span>{m.createdAt}</span>
                        {isMine && <CheckCheck className="w-3 h-3 text-[#2ed573]" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#120e24] border-t border-[#a29bfe]/15 flex items-center gap-2">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message @${activeChatTarget.username}...`}
                className="flex-1 bg-[#0b0914] border border-[#a29bfe]/20 rounded-full px-4 py-2 text-xs text-white placeholder-[#8b85b1] focus:outline-none focus:border-[#6c5ce7]"
                disabled={!currentUser}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending || !currentUser}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white flex items-center justify-center disabled:opacity-40 gpu-tap flex-shrink-0 shadow-md shadow-[#6c5ce7]/30"
              >
                <Send className="w-4 h-4 text-white -rotate-12" />
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
