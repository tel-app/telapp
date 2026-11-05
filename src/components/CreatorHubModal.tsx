import React, { useMemo, useState } from 'react';
import { BarChart3, Check, Languages, Music2, Scissors, Sparkles, Subtitles, TrendingUp, X } from 'lucide-react';
import { PostItem } from '../lib/firebase';

export const INTEREST_OPTIONS = ['Trending', 'Music & Beats', 'Gaming', 'Cinematic', 'Tech & Code', 'Comedy', 'Sports', 'Education'];

interface CreatorHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: PostItem[];
  interests: string[];
  onSaveInterests: (interests: string[]) => void;
  onApplyStudio: (result: { description: string; tags: string[]; audioTrack: string }) => void;
}

export const CreatorHubModal: React.FC<CreatorHubModalProps> = ({
  isOpen, onClose, posts, interests, onSaveInterests, onApplyStudio
}) => {
  const [tab, setTab] = useState<'dashboard' | 'studio' | 'sounds' | 'interests'>('dashboard');
  const [selectedInterests, setSelectedInterests] = useState(interests);
  const [studioTitle, setStudioTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioTrack, setAudioTrack] = useState('Original Sound');
  const [captions, setCaptions] = useState(true);
  const [backgroundRemoval, setBackgroundRemoval] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [translation, setTranslation] = useState(false);
  const [trim, setTrim] = useState(false);

  const stats = useMemo(() => {
    const views = posts.reduce((sum, post) => sum + post.likesCount * 12 + post.commentsCount * 4 + post.sharesCount * 8, 0);
    const watchMinutes = posts.reduce((sum, post) => sum + Math.max(1, Number.parseInt(post.duration || '0', 10) || 15) * 3, 0);
    const engagement = posts.length ? Math.round(posts.reduce((sum, post) => sum + post.likesCount + post.commentsCount + post.sharesCount, 0) / posts.length) : 0;
    return { views, watchMinutes, engagement };
  }, [posts]);

  if (!isOpen) return null;

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(item => item !== interest) : [...prev, interest]);
  };

  const generateDescription = () => {
    const cleanTitle = studioTitle.trim() || 'My new TelApp video';
    setDescription(`${cleanTitle} — a fresh vertical video for the TelApp community. Watch, share and join the conversation.`);
  };

  const saveStudio = () => {
    const tags = selectedInterests.length ? selectedInterests : ['Trending'];
    onApplyStudio({ description: description.trim() || studioTitle.trim() || 'New TelApp video', tags, audioTrack });
  };

  const tabs = [
    ['dashboard', 'Analytics'], ['studio', 'AI Studio'], ['sounds', 'Sounds'], ['interests', 'For You']
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-hidden bg-[#16122c] border border-[#a29bfe]/25 rounded-t-[30px] sm:rounded-[30px] shadow-2xl text-left flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#a29bfe]/15">
          <div><h2 className="text-base font-black text-white">Creator Hub</h2><p className="text-[10px] text-[#8b85b1]">Create, understand and grow your community</p></div>
          <button onClick={onClose} className="p-2 rounded-full bg-[#0b0914] text-[#8b85b1] hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 p-2 overflow-x-auto no-scrollbar border-b border-[#a29bfe]/10">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold ${tab === id ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white' : 'text-[#8b85b1] bg-[#0b0914]'}`}>{label}</button>)}
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {tab === 'dashboard' && <>
            <div className="grid grid-cols-3 gap-2">
              {[['Total views', stats.views.toLocaleString()], ['Watch time', `${stats.watchMinutes} min`], ['Engagement', stats.engagement.toLocaleString()]].map(([label, value]) => <div key={label} className="p-3 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/15"><span className="text-[10px] text-[#8b85b1] block">{label}</span><strong className="text-lg text-white">{value}</strong></div>)}
            </div>
            <div className="p-4 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/15"><div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-[#a29bfe]" /><h3 className="text-xs font-bold text-white">Content performance</h3></div>{posts.slice(0, 6).map((post, index) => { const score = Math.min(100, post.likesCount * 5 + post.commentsCount * 8 + post.sharesCount * 10 + 12); return <div key={post.id} className="flex items-center gap-2 mb-2"><span className="w-5 text-[10px] text-[#8b85b1]">#{index + 1}</span><div className="flex-1 h-2 rounded-full bg-[#211c42] overflow-hidden"><div className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#e84393]" style={{ width: `${score}%` }} /></div><span className="w-8 text-right text-[10px] text-white">{score}%</span></div>})}{!posts.length && <p className="text-xs text-[#8b85b1]">Publish a reel to see audience insights and best-performing content.</p>}</div>
            <div className="grid grid-cols-2 gap-2"><div className="p-3 rounded-2xl bg-[#211c42] border border-[#a29bfe]/15"><TrendingUp className="w-4 h-4 text-[#2ed573] mb-2" /><b className="text-xs text-white block">Follower growth</b><span className="text-[10px] text-[#8b85b1]">Track follows from each reel</span></div><div className="p-3 rounded-2xl bg-[#211c42] border border-[#a29bfe]/15"><Sparkles className="w-4 h-4 text-[#ffd700] mb-2" /><b className="text-xs text-white block">Audience insights</b><span className="text-[10px] text-[#8b85b1]">Use interests to personalize reach</span></div></div>
          </>}

          {tab === 'studio' && <>
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6c5ce7]/20 to-[#e84393]/15 border border-[#a29bfe]/20"><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#ffd700]" /><div><b className="text-xs text-white">AI Video Creator Studio</b><p className="text-[10px] text-[#8b85b1]">Prepare your reel before publishing</p></div></div></div>
            <input value={studioTitle} onChange={e => setStudioTitle(e.target.value)} placeholder="Video title or topic" className="w-full rounded-xl bg-[#0b0914] border border-[#a29bfe]/20 px-3 py-2 text-xs text-white" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Auto-generated description" rows={3} className="w-full rounded-xl bg-[#0b0914] border border-[#a29bfe]/20 px-3 py-2 text-xs text-white resize-none" />
            <button onClick={generateDescription} className="w-full py-2 rounded-xl bg-[#211c42] text-xs font-bold text-[#a29bfe]">Generate description</button>
            <div className="grid grid-cols-2 gap-2">{[['Automatic captions', captions, setCaptions, Subtitles], ['Background removal', backgroundRemoval, setBackgroundRemoval, Sparkles], ['Enhance & filters', enhance, setEnhance, Sparkles], ['Automatic translation', translation, setTranslation, Languages], ['Smart trimming', trim, setTrim, Scissors]].map(([label, checked, setter, Icon]: any) => <button key={label as string} onClick={() => setter(!checked)} className={`p-3 rounded-xl border text-left ${checked ? 'border-[#6c5ce7] bg-[#6c5ce7]/15' : 'border-[#a29bfe]/15 bg-[#0b0914]'}`}><Icon className={`w-4 h-4 mb-1 ${checked ? 'text-[#e84393]' : 'text-[#8b85b1]'}`} /><span className="text-[10px] text-white block">{label as string}</span><span className="text-[9px] text-[#8b85b1]">{checked ? 'Enabled' : 'Off'}</span></button>)}</div>
            <button onClick={saveStudio} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold">Apply studio settings to next reel</button>
          </>}

          {tab === 'sounds' && <>
            <div className="flex items-center gap-2"><Music2 className="w-5 h-5 text-[#e84393]" /><div><h3 className="text-sm font-bold text-white">Sound library</h3><p className="text-[10px] text-[#8b85b1]">Trending and original audio for your next reel</p></div></div>
            {['Original Sound', 'Afrobeat Pulse', 'Midnight Cinematic', 'Trending Creator Mix', 'Voice-over recording'].map((sound, index) => <button key={sound} onClick={() => { setAudioTrack(sound); onApplyStudio({ description, tags: selectedInterests, audioTrack: sound }); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0b0914] border border-[#a29bfe]/15 hover:border-[#e84393]/50"><span className="flex items-center gap-2 text-xs text-white"><Music2 className="w-4 h-4 text-[#a29bfe]" />{sound}</span><span className="text-[10px] text-[#8b85b1]">{index === 0 ? 'Your audio' : 'Trending'}</span></button>)}
          </>}

          {tab === 'interests' && <><div><h3 className="text-sm font-bold text-white">Personalize For You</h3><p className="text-[10px] text-[#8b85b1] mt-1">Choose topics for recommendations, Explore and your feed.</p></div><div className="flex flex-wrap gap-2">{INTEREST_OPTIONS.map(interest => <button key={interest} onClick={() => toggleInterest(interest)} className={`px-3 py-2 rounded-full text-[11px] font-bold border ${selectedInterests.includes(interest) ? 'bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white border-transparent' : 'bg-[#0b0914] text-[#8b85b1] border-[#a29bfe]/20'}`}>{selectedInterests.includes(interest) && <Check className="inline w-3 h-3 mr-1" />}{interest}</button>)}</div><button onClick={() => { onSaveInterests(selectedInterests); onClose(); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white text-xs font-bold">Save interests</button></>}
        </div>
      </div>
    </div>
  );
};
