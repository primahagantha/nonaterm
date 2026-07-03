# Update Setup

## Signing Keys

Generate updater signing keys locally:

```bash
npm run tauri signer generate
```

Store these GitHub secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## GitHub Releases Flow

1. Tag a release using `vX.Y.Z`
2. GitHub Actions builds MSI/NSIS artifacts
3. Release uploads assets and `latest.json`
4. Nonaterm updater checks:

```text
https://github.com/Nonaterm/Nonaterm/releases/latest/download/latest.json
```

## Notes

- `pubkey` in `tauri.conf.json` must be replaced before public release.
- Auto-update currently detects + installs updates; release signing must be configured first.
