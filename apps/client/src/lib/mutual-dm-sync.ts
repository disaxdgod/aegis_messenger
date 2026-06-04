import {
  DEMO_EMPLOYEES,
} from "@/data/demo-seed";
import { findEmployeeByDisplayName, normalizeProfileUsername } from "@/lib/profile-directory";
import { hasMutualFollowWithEmployee } from "@/lib/social-graph";
import { useAuthorSubscriptionsStore } from "@/stores/author-subscriptions-store";
import { useDmInboxStore } from "@/stores/dm-inbox-store";
import { useProfileStore } from "@/stores/profile-store";

export function syncMutualDmAfterSubscriptionChange(authorDisplayName: string) {
  const username = useProfileStore.getState().username;
  const subscribedKeys = useAuthorSubscriptionsStore.getState().subscribedKeys;
  const employee = findEmployeeByDisplayName(authorDisplayName);
  if (!employee || !username.trim()) {
    return;
  }
  if (
    !hasMutualFollowWithEmployee(
      employee.username,
      username,
      subscribedKeys,
    )
  ) {
    return;
  }
  useDmInboxStore.getState().ensureEmployeeDmChat(employee.username);
}

/** Создаёт чаты для всех взаимных подписок (например, при первом входе в «Сообщения»). */
export function syncAllMutualDmChats() {
  const username = useProfileStore.getState().username;
  const subscribedKeys = useAuthorSubscriptionsStore.getState().subscribedKeys;
  const me = normalizeProfileUsername(username);
  if (!me) {
    return;
  }
  const ensure = useDmInboxStore.getState().ensureEmployeeDmChat;
  for (const employee of DEMO_EMPLOYEES) {
    if (employee.username === me) {
      continue;
    }
    if (
      hasMutualFollowWithEmployee(
        employee.username,
        username,
        subscribedKeys,
      )
    ) {
      ensure(employee.username);
    }
  }
}
