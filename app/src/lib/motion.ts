/** Product transitions settle within 300 ms; no spring overshoot. */
export const workspaceMotion = {
  snap: { duration: 0.1, ease: "easeOut" as const },
  surface: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
  gentle: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
};
