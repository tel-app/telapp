import { PostItem, UserProfile } from './firebase';

// Real application mode: zero test/fake mock users or mock uploads.
// All users and reels are created by real users.
export const INITIAL_CREATORS: UserProfile[] = [];
export const INITIAL_POSTS: PostItem[] = [];

export async function ensureInitialSeedData(): Promise<void> {
  // Pure real mode: no fake test data or dummy accounts are written to Firestore.
}
