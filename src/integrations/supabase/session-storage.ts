import { brokeredPreviewStorage } from "./previewAuthStorage";

type StorageLike = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
};
const CHOICE = "nomotecnia.remember-session";

export function createSessionStorage(
  persistent: StorageLike,
  temporary: Storage,
  preferences: Storage,
) {
  const remembers = () => (temporary.getItem(CHOICE) ?? preferences.getItem(CHOICE)) === "yes";
  return {
    choose(remember: boolean) {
      temporary.setItem(CHOICE, remember ? "yes" : "no");
      if (remember) preferences.setItem(CHOICE, "yes");
      else preferences.removeItem(CHOICE);
    },
    async getItem(key: string) {
      return remembers() ? await persistent.getItem(key) : temporary.getItem(key);
    },
    async setItem(key: string, value: string) {
      if (remembers()) {
        await persistent.setItem(key, value);
        temporary.removeItem(key);
      } else {
        temporary.setItem(key, value);
        await persistent.removeItem(key);
      }
    },
    async removeItem(key: string) {
      temporary.removeItem(key);
      await persistent.removeItem(key);
    },
  };
}
let storage: ReturnType<typeof createSessionStorage> | undefined;
export function sessionStorageAdapter() {
  if (typeof window === "undefined") return undefined;
  return (storage ??= createSessionStorage(
    brokeredPreviewStorage()!,
    window.sessionStorage,
    window.localStorage,
  ));
}
export function setRememberMe(remember: boolean) {
  sessionStorageAdapter()?.choose(remember);
}
