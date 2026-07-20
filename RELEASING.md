# Releasing Sturna

Releases are cut by pushing a version tag. The `Release` workflow verifies the
tree, publishes a GitHub Release with generated notes, and (if configured)
publishes the package to npm.

## Cutting a release

1. Update `CHANGELOG.md`: move entries from `Unreleased` into a new version
   section with today's date, and update the compare links at the bottom.
2. Bump the version (no tag yet — the tag drives the workflow):

   ```bash
   npm version 0.2.0 --no-git-tag-version
   ```

3. Commit, tag, and push:

   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "Release v0.2.0"
   git tag v0.2.0
   git push && git push --tags
   ```

The workflow then:

- re-runs typecheck, the unit suite, a paper-mode swarm cycle, and the
  library build;
- fails if the tag does not match `package.json`'s version;
- creates a GitHub Release with auto-generated notes;
- publishes to npm **only when** an `NPM_TOKEN` repository secret is
  configured (Settings > Secrets and variables > Actions). Without the
  secret, the publish step is skipped cleanly — publishing is optional.

## Versioning policy

Semantic Versioning. Pre-1.0, minor versions may contain breaking changes;
call them out in the changelog.
