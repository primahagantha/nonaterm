# Release signing setup

Nonaterm uses [tauri-plugin-updater](https://v2.tauri.app/plugin/updater/)
to deliver signed updates. This document explains how the keypair was
generated and what needs to happen on the CI side.

## Generated keypair (MVP only)

A development keypair lives in `keys/` and is **not** committed to git
(see `.gitignore`). The public half is pinned in
`src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.

```
keys/Nonaterm      ← private key (KEEP SECRET, do not commit)
keys/Nonaterm.pub  ← public key (already in tauri.conf.json)
```

The MVP private key is a placeholder. **Before the first public release
you must rotate this keypair** and update `pubkey` in
`src-tauri/tauri.conf.json` plus all CI secrets.

## Rotate / generate a fresh key

```bash
# Local generation
mkdir -p keys
npx tauri signer generate -p "<strong-password>" -w keys/Nonaterm -f
```

Then:

1. Copy `keys/Nonaterm.pub` to `src-tauri/tauri.conf.json` →
   `plugins.updater.pubkey`.
2. Store the contents of `keys/Nonaterm` (the private key) in the
   GitHub repository secret `TAURI_SIGNING_PRIVATE_KEY`.
3. Store the password in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Commit the updated `tauri.conf.json` and the rotation commit.
5. Delete the local `keys/Nonaterm` after the secret is uploaded.

## Signing bundles locally

```bash
pwsh scripts/sign-release.ps1
```

This walks every bundle under `src-tauri/target/release/bundle/`,
generates a `.sig` next to each artifact, and emits a `latest.json`
manifest pointing to the freshly signed binaries. The script reads
credentials from the same `TAURI_SIGNING_PRIVATE_KEY*` env vars the
release workflow uses.

## Setting GitHub Secrets

To enable automatic signing in CI, set these repository secrets:

```bash
# Set the private key (contents of keys/nonaterm)
gh secret set TAURI_SIGNING_PRIVATE_KEY --body "$(cat keys/nonaterm)"

# Set the password used during key generation
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body "YourPasswordHere"
```

Verify secrets are set:
```bash
gh secret list
```

## CI release pipeline

`.github/workflows/release.yml` runs on `v*` tag pushes:

1. `npm run tauri build` — produces MSI / NSIS bundles.
2. `pwsh scripts/sign-release.ps1` — signs each bundle + writes
   `latest.json`.
3. `softprops/action-gh-release` uploads everything under
   `src-tauri/target/release/bundle/**/*` plus the manifest to the
   GitHub release page.

The updater reads `latest.json` from the endpoint configured in
`tauri.conf.json` and verifies the signature against the pinned
`pubkey`. If the pubkey is rotated, **all existing installs need an
explicit reinstall** because the embedded pubkey no longer matches
the signature on the manifest.
