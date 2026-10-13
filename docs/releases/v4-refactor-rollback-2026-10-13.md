# Production rollback reference — 13 October 2026

Saved before releasing the v4 data refactor and PDF fixes.

## Previous working release

- Git commit: c28b13ce864441ab94485b48647c81c0dc1a1c5d
- Git tag: v4-production-before-refactor-2026-10-13
- Vercel project: out (prj_sqZIV1je9UfHSAMzcQapGXICOyU9)
- Previous web deployment: https://out-ehgze8suu-ricardoho1607s-projects.vercel.app
- Deployment ID: dpl_J8oxLJKW5MFJUUEAM4c8WxmShcPv
- Production domain: https://www.shrimplytech.com
- Android update group: 0566c894-b45e-4460-9c17-4fa116290ae3
- Android update ID: 01a11ba5-0d4b-772d-be82-087863724121
- EAS project: 8a20b603-ee9c-44cc-8797-1865788511db
- Channel and branch: production
- Runtime: 3.2.1-sdk57

## Restore if explicitly requested

From a checkout linked to Vercel project out:

```sh
npx vercel@latest rollback https://out-ehgze8suu-ricardoho1607s-projects.vercel.app --yes
```

Verify the domain serves that deployment. Rollback can suspend automatic production promotion; promote the fixed deployment when ready.

Restore the previous Android update for the same runtime:

```sh
npx eas-cli@latest update:republish --group 0566c894-b45e-4460-9c17-4fa116290ae3 --destination-channel production --platform android --message "Restore pre-refactor v4" --non-interactive
```

Verify the new production update group targets Android and runtime 3.2.1-sdk57. Devices must fetch and apply the restored update; delivery is not instantaneous.

These operations do not restore Firebase data, backend deployments, or environment variables. This release contains no Firebase deployment or schema migration. Keep the refactor branch for fixes; do not reset or force-push it.
