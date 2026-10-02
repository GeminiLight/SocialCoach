export const DINNER_SAVE_KEY = 'socialcoach-dinner-v1';
export const DINNER_LAUNCH_KEY = 'socialcoach.3d-launch.v1';

/** Preserve even an unreadable 3D save in the main backup, never model keys. */
export function dinnerBackup(): unknown {
  try {
    const raw = localStorage.getItem(DINNER_SAVE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return { unreadable: raw }; }
  } catch { return null; }
}
