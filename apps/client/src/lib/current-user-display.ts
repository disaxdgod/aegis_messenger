/** Имя для шапки поста / комментария из данных текущего профиля. */
export function currentUserDisplayName(
  firstName: string,
  lastName: string,
  username: string,
): string {
  const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  if (full.length > 0) {
    return full;
  }
  const handle = username.trim();
  return handle.length > 0 ? handle : "Пользователь";
}

/** Логин без @ для отображения и постов. */
export function currentUserHandle(username: string): string {
  const handle = username.trim();
  return handle.length > 0 ? handle : "user";
}
