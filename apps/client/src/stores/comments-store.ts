import { DEMO_SEED_COMMENTS } from "@/data/demo-seed";
import { createClientId } from "@/lib/create-client-id";
import { create } from "zustand";

export type CommentAttachment = {
  kind: "image" | "video" | "file";
  url: string;
  name: string;
  mime: string;
  compressed?: boolean;
};

export type CommentEntity = {
  id: string;
  postId: string;
  parentId: string | null;
  text: string;
  createdAt: number;
  authorName: string;
  authorAvatar: string | null;
  likes: number;
  liked: boolean;
  attachment?: CommentAttachment | null;
};

type AddCommentInput = Omit<
  CommentEntity,
  "id" | "createdAt" | "likes" | "liked"
>;

type CommentsState = {
  comments: CommentEntity[];
  addComment: (input: AddCommentInput) => string;
  removeComment: (id: string) => void;
  toggleLike: (id: string) => void;
  getForPost: (postId: string) => CommentEntity[];
};

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: DEMO_SEED_COMMENTS,

  addComment: (input) => {
    const id = createClientId();
    const entity: CommentEntity = {
      ...input,
      id,
      createdAt: Date.now(),
      likes: 0,
      liked: false,
    };
    set((s) => ({ comments: [...s.comments, entity] }));
    return id;
  },

  removeComment: (id) => {
    set((s) => {
      for (const c of s.comments) {
        if ((c.id === id || c.parentId === id) && c.attachment?.url?.startsWith("blob:")) {
          URL.revokeObjectURL(c.attachment.url);
        }
      }
      return {
        comments: s.comments.filter((c) => c.id !== id && c.parentId !== id),
      };
    });
  },

  toggleLike: (id) => {
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              liked: !c.liked,
              likes: c.liked ? c.likes - 1 : c.likes + 1,
            },
      ),
    }));
  },

  getForPost: (postId) => {
    return get().comments.filter((c) => c.postId === postId);
  },
}));
