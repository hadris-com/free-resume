# Chrome Extension

> **Do not edit** `js/`, `css/`, or `fonts/` in this directory.
> They are copies of the main app assets and will be overwritten.

## For developers

After changing any JS, CSS, or font file in the project root, sync them into the extension:

```sh
# from the repo root
sh chrome-extension/sync-assets.sh
```

Then reload the extension in `chrome://extensions`.

## Structure

| Path | Source | Editable |
|---|---|---|
| `content.js`, `popup.*`, `renderer/` | Extension-specific | Yes |
| `js/`, `css/`, `fonts/` | Copied from repo root | **No** — run `sync-assets.sh` |
| `manifest.json` | Extension config | Yes |
