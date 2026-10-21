# .github

The Sprite AI org's front page (`profile/README.md`) and the rules every repo in the org follows.

## Repo names

Every repo is named `sprite-ai-<thing>`.

- All lowercase, words split by hyphens. No capitals, no underscores.
- `<thing>` is one or two plain words: the platform it lives on, or the one job it does.
- The local folder, the GitHub repo and any package it publishes all use the same name.
- The one exception is this repo. GitHub only shows an org front page from a repo named `.github`.

| Repo | What it is |
|---|---|
| `sprite-ai-mcp` | The MCP server's listing files (README, `server.json`). The server itself runs on sprite-ai.art. |
| `sprite-ai-integrations` | One private monorepo for every app that talks to our API: Aseprite, Godot, the browser extension, the Discord bot, Canva, Google, Make, Bubble. Same shape as `silentcut-engine`: one contract (`openapi.json`), generated glue, thin apps. |
| `sprite-ai-godot` | The Godot plugin on its own, only if the Godot store needs its own repo. |
| `sprite-ai-pixel-snap` | Open source. Snaps a blurry AI image to a clean pixel grid. |
| `sprite-ai-sheet-tools` | Open source. Sprite sheet slicer and packer for the command line. |
| `sprite-ai-palettes` | Open data. Our palettes, free to use. |
| `sprite-ai-web` | The website, if it ever moves here. Today it is `4cplayz/sprites-ai`. |

The test for a new repo: if it talks to our API, it goes in `sprite-ai-integrations`. If people download it or star it on its own, it gets its own `sprite-ai-<thing>` repo.

## Every public repo has

1. A banner made with `scripts/banner.mjs` (below), at the top of its README.
2. One sentence on what it does, then a link to https://www.sprite-ai.art.
3. On GitHub: the description, the website link, a license, and topics from this list: `pixel-art`, `game-development`, `sprite`, `gamedev`, `ai`, plus the platform (`mcp`, `godot`, `aseprite`, ...).

## Make a banner

The banner is the landing page's space invaders: the formation marches, the cannon shoots, the aliens pop. It comes in a light and a dark version.

```
node scripts/banner.mjs --title "SPRITE AI MCP" --subtitle "MCP SERVER FOR AI EDITORS" --out assets/banner
```

That writes `assets/banner-light.svg` and `assets/banner-dark.svg`. Put this at the top of the README:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.svg">
  <img alt="Sprite AI MCP" src="./assets/banner-light.svg" width="100%">
</picture>
```

The font has A to Z, 0 to 9, space and `- . / : + !`. Titles shrink to fit, so keep them under about 18 characters.
