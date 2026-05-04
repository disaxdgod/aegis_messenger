import { create } from "zustand";

/** Статус «как в Discord» (индикатор у аватара). */
export type PresenceStatus = "online" | "dnd" | "invisible";

export type ProfileState = {
  /** Логин без @ (для поиска и шапки профиля). */
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  birthDate: string;
  presence: PresenceStatus;
  /** Превью аватара (blob: URL), освобождается при смене или сбросе. */
  avatarObjectUrl: string | null;
  /** Баннер профиля (blob: URL), освобождается при смене или сбросе. */
  bannerObjectUrl: string | null;
  setUsername: (v: string) => void;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setStatus: (v: string) => void;
  setPresence: (v: PresenceStatus) => void;
  setBirthDate: (v: string) => void;
  setAvatarFromFile: (file: File) => void;
  /** Установить аватар из уже обрезанного изображения (JPEG). */
  setAvatarFromBlob: (blob: Blob) => void;
  /** Баннер из canvas (PNG). */
  setBannerFromBlob: (blob: Blob) => void;
  reset: () => void;
};

const textInitial = {
  firstName: "",
  lastName: "",
  status: "",
  birthDate: "",
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  username: "disaxdgod",
  ...textInitial,
  presence: "online",
  avatarObjectUrl: null,
  bannerObjectUrl: null,
  setUsername: (username) => set({ username }),
  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setStatus: (status) => set({ status }),
  setPresence: (presence) => set({ presence }),
  setBirthDate: (birthDate) => set({ birthDate }),
  setAvatarFromFile: (file) => {
    const next = URL.createObjectURL(file);
    const prev = get().avatarObjectUrl;
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    set({ avatarObjectUrl: next });
  },
  setAvatarFromBlob: (blob) => {
    const next = URL.createObjectURL(blob);
    const prev = get().avatarObjectUrl;
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    set({ avatarObjectUrl: next });
  },
  setBannerFromBlob: (blob) => {
    const next = URL.createObjectURL(blob);
    const prev = get().bannerObjectUrl;
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    set({ bannerObjectUrl: next });
  },
  reset: () => {
    const prevA = get().avatarObjectUrl;
    if (prevA) {
      URL.revokeObjectURL(prevA);
    }
    const prevB = get().bannerObjectUrl;
    if (prevB) {
      URL.revokeObjectURL(prevB);
    }
    set({
      username: "disaxdgod",
      ...textInitial,
      presence: "online",
      avatarObjectUrl: null,
      bannerObjectUrl: null,
    });
  },
}));
