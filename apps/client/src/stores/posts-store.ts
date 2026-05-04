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
  options: string[];
};

export type PostStats = {
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  liked: boolean;
};

export type PostEntity = {
  id: string;
  text: string;
  createdAt: number;
  /** Время последнего изменения текста; `null` — не редактировался. */
  editedAt: number | null;
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
  addPost: (
    post: Omit<PostEntity, "id" | "createdAt" | "stats" | "editedAt">,
  ) => void;
  updatePost: (
    id: string,
    patch: Partial<Pick<PostEntity, "text" | "poll" | "media">>,
  ) => void;
  removePost: (id: string) => void;
  toggleLike: (id: string) => void;
  incrementViews: (id: string) => void;
};

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],

  addPost: (post) => {
    const entity: PostEntity = {
      ...post,
      id: createClientId(),
      createdAt: Date.now(),
      editedAt: null,
      stats: defaultStats(),
    };
    set((s) => ({ posts: [entity, ...s.posts] }));
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

  incrementViews: (id) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id !== id
          ? p
          : { ...p, stats: { ...p.stats, views: p.stats.views + 1 } },
      ),
    }));
  },
}));
