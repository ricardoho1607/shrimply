// Build-time rollout: main production defaults off; the SOP test deployment opts in.
export const ADAPTIVE_SOPS_ENABLED = process.env.NEXT_PUBLIC_ADAPTIVE_SOPS_ENABLED === "true";
