import {
  DEMO_SEED_NEXT_SEQ,
  DEMO_SEED_POSTS,
} from "@/data/demo-seed";
import { createClientId } from "@/lib/create-client-id";
import { create } from "zustand";

export type PostMediaItem = {
  id: string;
  url: string;
  mime: string;
  kind: "image" | "video";
};

export type PostPollData = {
  question: string;
  anonymous: boolean;
  allowMultiple: boolean;
  allowVoteCancel: boolean;
  endsAt: number | null;
  options: {
    id: string;
    text: string;
    votes: {
      voterId: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    }[];
  }[];
};

export type PostStats = {
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  liked: boolean;
};

export type PostAuthor = {
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type PostEntity = {
  id: string;
  /** Короткий номер для URL (`?post=1`), монотонно растёт. */
  seq: number;
  text: string;
  createdAt: number;
  /** Время последнего изменения текста; `null` — не редактировался. */
  editedAt: number | null;
  author: PostAuthor;
  /** Свой пост — доступны редактирование и удаление в UI. */
  isOwn?: boolean;
  media: PostMediaItem[];
  poll: PostPollData | null;
  stats: PostStats;
};

function revokeMedia(media: PostMediaItem[]) {
  for (const m of media) {
    URL.revokeObjectURL(m.url);
  }
}

function defaultStats(): PostStats {
  return { likes: 0, comments: 0, reposts: 0, views: 0, liked: false };
}


type PostsState = {
  posts: PostEntity[];
  /** Следующий `seq` для нового поста. */
  nextSeq: number;
  addPost: (
    post: Omit<PostEntity, "id" | "seq" | "createdAt" | "stats" | "editedAt">,
  ) => void;
  updatePost: (
    id: string,
    patch: Partial<Pick<PostEntity, "text" | "poll" | "media">>,
  ) => void;
  removePost: (id: string) => void;
  toggleLike: (id: string) => void;
  incrementReposts: (id: string) => void;
  incrementViews: (id: string) => void;
  voteInPoll: (
    postId: string,
    optionId: string,
    voter: {
      voterId: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    },
  ) => void;
};

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: DEMO_SEED_POSTS,
  nextSeq: DEMO_SEED_NEXT_SEQ,

  addPost: (post) => {
    const seq = get().nextSeq;
    const entity: PostEntity = {
      ...post,
      id: createClientId(),
      seq,
      createdAt: Date.now(),
      editedAt: null,
      stats: defaultStats(),
    };
    set((s) => ({ posts: [entity, ...s.posts], nextSeq: s.nextSeq + 1 }));
  },

  updatePost: (id, patch) => {
    set((s) => ({
      posts: s.posts.map((p) => {
        if (p.id !== id) {
          return p;
        }
        const next = { ...p, ...patch };
        if (
          typeof patch.text === "string" &&
          patch.text !== p.text
        ) {
          next.editedAt = Date.now();
        }
        return next;
      }),
    }));
  },

  removePost: (id) => {
    const post = get().posts.find((p) => p.id === id);
    if (post) {
      revokeMedia(post.media);
    }
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
  },

  toggleLike: (id) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              stats: {
                ...p.stats,
                liked: !p.stats.liked,
                likes: p.stats.liked ? p.stats.likes - 1 : p.stats.likes + 1,
              },
            },
      ),
    }));
  },

  incrementReposts: (id) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              stats: {
                ...p.stats,
                reposts: p.stats.reposts + 1,
              },
            },
      ),
    }));
  },

  incrementViews: (id) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id !== id
          ? p
          : { ...p, stats: { ...p.stats, views: p.stats.views + 1 } },
      ),
    }));
  },

  voteInPoll: (postId, optionId, voter) => {
    set((s) => ({
      posts: s.posts.map((p) => {
        if (p.id !== postId || !p.poll) {
          return p;
        }
        if (p.poll.endsAt !== null && Date.now() > p.poll.endsAt) {
          return p;
        }
        const votedInCurrent = p.poll.options.some(
          (o) =>
            o.id === optionId &&
            o.votes.some((v) => v.voterId === voter.voterId),
        );

        let optionsNext = p.poll.options;

        if (p.poll.allowMultiple) {
          if (votedInCurrent) {
            if (!p.poll.allowVoteCancel) {
              return p;
            }
            optionsNext = p.poll.options.map((o) =>
              o.id !== optionId
                ? o
                : {
                    ...o,
                    votes: o.votes.filter((v) => v.voterId !== voter.voterId),
                  },
            );
          } else {
            optionsNext = p.poll.options.map((o) =>
              o.id !== optionId ? o : { ...o, votes: [...o.votes, voter] },
            );
          }
        } else {
          const selectedBefore =
            p.poll.options.find((o) =>
              o.votes.some((v) => v.voterId === voter.voterId),
            )?.id ?? null;
          const shouldRemoveVote = selectedBefore === optionId;
          if (shouldRemoveVote && !p.poll.allowVoteCancel) {
            return p;
          }
          const optionsCleared = p.poll.options.map((o) => ({
            ...o,
            votes: o.votes.filter((v) => v.voterId !== voter.voterId),
          }));
          optionsNext = shouldRemoveVote
            ? optionsCleared
            : optionsCleared.map((o) =>
                o.id !== optionId ? o : { ...o, votes: [...o.votes, voter] },
              );
        }
        return { ...p, poll: { ...p.poll, options: optionsNext } };
      }),
    }));
  },
}));
