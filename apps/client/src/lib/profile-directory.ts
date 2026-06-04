import {
  DEMO_EMPLOYEES,
  demoAvatar,
  demoEmployeeDisplayName,
  type DemoEmployee,
} from "@/data/demo-seed";

export function normalizeProfileUsername(raw: string): string {
  return raw.trim().replace(/^@+/u, "").toLowerCase();
}

export function findEmployeeByUsername(username: string): DemoEmployee | null {
  const key = normalizeProfileUsername(username);
  if (!key) {
    return null;
  }
  return DEMO_EMPLOYEES.find((e) => e.username === key) ?? null;
}

export function findEmployeeByDisplayName(displayName: string): DemoEmployee | null {
  const key = displayName.trim().toLowerCase();
  if (!key) {
    return null;
  }
  return (
    DEMO_EMPLOYEES.find(
      (e) => demoEmployeeDisplayName(e).toLowerCase() === key,
    ) ?? null
  );
}

/** Логин для перехода в профиль по @username или отображаемому имени. */
export function resolveProfileUsername(input: {
  username?: string | null;
  displayName?: string | null;
}): string | null {
  if (input.username?.trim()) {
    const fromHandle = findEmployeeByUsername(input.username);
    if (fromHandle) {
      return fromHandle.username;
    }
    const normalized = normalizeProfileUsername(input.username);
    return normalized.length > 0 ? normalized : null;
  }
  if (input.displayName?.trim()) {
    const fromName = findEmployeeByDisplayName(input.displayName);
    if (fromName) {
      return fromName.username;
    }
  }
  return null;
}

export function employeeAvatarUrl(employee: DemoEmployee): string {
  return demoAvatar(employee.username);
}

export function employeeRoleLine(employee: DemoEmployee): string {
  return `${employee.role} · ${employee.department}`;
}
