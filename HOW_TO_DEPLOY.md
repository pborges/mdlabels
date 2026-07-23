# How to deploy

1. Increment VERSION
2. Add an entry to CHANGELOG.md
3. `git commit`
4. `bin/release`
5. Bump `newTag` in `deploy/overlays/prod/kustomization.yaml` to match VERSION, commit and push
6. ArgoCD picks up the change via GitOps and syncs automatically
7. Profit