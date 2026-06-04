import {
  DEMO_EMPLOYEES,
  DEMO_FOLLOWING,
  demoAvatar,
  demoEmployeeDisplayName,
  type DemoEmployee,
} from "@/data/demo-seed";
import { authorSubscriptionKey } from "@/lib/author-subscription-key";
import { normalizeProfileUsername } from "@/lib/profile-directory";
import type { InboxChatItem } from "@/stores/dm-inbox-store";

export type SocialProfile = {
  username: string;
  displayName: string;
  avatarUrl: string;
  roleLine: string;
};

const EMPLOYEE_BY_USERNAME = Object.fromEntries(
  DEMO_EMPLOYEES.map((e) => [e.username, e]),
) as Record<string, DemoEmployee>;

function employeeRoleLine(employee: DemoEmployee): string {
  return `${employee.role} · ${employee.department}`;
}

function toSocialProfile(username: string): SocialProfile | null {
  const employee = EMPLOYEE_BY_USERNAME[username];
  if (!employee) {
    return null;
  }
  return {
    username: employee.username,
    displayName: demoEmployeeDisplayName(employee),
    avatarUrl: demoAvatar(employee.username),
    roleLine: employeeRoleLine(employee),
  };
}

function compareProfiles(a: SocialProfile, b: SocialProfile): number {
  return a.displayName.localeCompare(b.displayName, "ru");
}

/** Кого читает пользователь; для текущего — из живого стора подписок. */
export function getEffectiveFollowingUsernames(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): string[] {
  const profile = normalizeProfileUsername(profileUsername);
  const current = normalizeProfileUsername(currentUserUsername);

  if (profile && current && profile === current) {
    return DEMO_EMPLOYEES.filter(
      (e) =>
        e.username !== profile &&
        subscribedKeys[authorSubscriptionKey(demoEmployeeDisplayName(e))],
    )
      .map((e) => e.username)
      .sort((a, b) =>
        demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[a]!).localeCompare(
          demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[b]!),
          "ru",
        ),
      );
  }

  return [...(DEMO_FOLLOWING[profile] ?? [])].sort((a, b) =>
    demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[a]!).localeCompare(
      demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[b]!),
      "ru",
    ),
  );
}

/** Кто читает пользователя (обратные рёбра графа + живые подписки текущего). */
export function getFollowerUsernames(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): string[] {
  const target = normalizeProfileUsername(profileUsername);
  if (!target) {
    return [];
  }

  const followers: string[] = [];
  for (const employee of DEMO_EMPLOYEES) {
    if (employee.username === target) {
      continue;
    }
    const following = getEffectiveFollowingUsernames(
      employee.username,
      currentUserUsername,
      subscribedKeys,
    );
    if (following.includes(target)) {
      followers.push(employee.username);
    }
  }

  return followers.sort((a, b) =>
    demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[a]!).localeCompare(
      demoEmployeeDisplayName(EMPLOYEE_BY_USERNAME[b]!),
      "ru",
    ),
  );
}

export function getFollowingProfiles(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): SocialProfile[] {
  return getEffectiveFollowingUsernames(
    profileUsername,
    currentUserUsername,
    subscribedKeys,
  )
    .map(toSocialProfile)
    .filter((p): p is SocialProfile => p !== null)
    .sort(compareProfiles);
}

export function getFollowerProfiles(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): SocialProfile[] {
  return getFollowerUsernames(profileUsername, currentUserUsername, subscribedKeys)
    .map(toSocialProfile)
    .filter((p): p is SocialProfile => p !== null)
    .sort(compareProfiles);
}

export function countFollowing(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): number {
  return getEffectiveFollowingUsernames(
    profileUsername,
    currentUserUsername,
    subscribedKeys,
  ).length;
}

export function countFollowers(
  profileUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): number {
  return getFollowerUsernames(profileUsername, currentUserUsername, subscribedKeys)
    .length;
}

const EMPLOYEE_USERNAMES = new Set(DEMO_EMPLOYEES.map((e) => e.username));

export function isDirectEmployeeDmHandle(handle: string): boolean {
  return EMPLOYEE_USERNAMES.has(normalizeProfileUsername(handle));
}

/** Взаимная подписка с сотрудником — условие личного чата в демо. */
export function hasMutualFollowWithEmployee(
  employeeUsername: string,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
): boolean {
  const me = normalizeProfileUsername(currentUserUsername);
  const them = normalizeProfileUsername(employeeUsername);
  if (!me || !them || me === them) {
    return false;
  }
  const iFollowThem = getEffectiveFollowingUsernames(
    me,
    me,
    subscribedKeys,
  ).includes(them);
  const theyFollowMe = getFollowerUsernames(me, me, subscribedKeys).includes(
    them,
  );
  return iFollowThem && theyFollowMe;
}

/** Групповые, начатые личные и новые (при взаимной подписке) чаты видны в списке. */
export function isDmChatUnlocked(
  chat: InboxChatItem,
  currentUserUsername: string,
  subscribedKeys: Record<string, true>,
  options?: { messageCount?: number },
): boolean {
  if (!isDirectEmployeeDmHandle(chat.handle)) {
    return true;
  }
  if ((options?.messageCount ?? 0) > 0) {
    return true;
  }
  return hasMutualFollowWithEmployee(
    chat.handle,
    currentUserUsername,
    subscribedKeys,
  );
}
