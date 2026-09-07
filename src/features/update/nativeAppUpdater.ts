import { registerPlugin } from "@capacitor/core";

export interface NativeAppUpdaterPlugin {
  install(options: { url: string }): Promise<{ started?: boolean; needsPermission?: boolean }>;
}

export const NativeAppUpdater = registerPlugin<NativeAppUpdaterPlugin>("AppUpdater");
