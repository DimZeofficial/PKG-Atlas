# PKG Atlas

Browse PS4 PKG packages: 2,539 entries with cover art, developer, release date, firmware note, download size, and a link to the source page that publishes the file.

[Open the live site](https://dimzeofficial.github.io/PS4-Content/)

## Finding a game

The search page carries the whole catalog and the controls to cut it down:

- Search by title, package ID (CUSA or PPSA), developer, or slug.
- Filter by genre, using the list built from the catalog itself.
- Filter by firmware, using the eight versions listed in the sidebar.
- Set a minimum and maximum download size in GB.
- Sort by title, release date, or size, in either direction.
- Show 12, 24, or 48 games per page.
- Take one at random when you have nothing particular in mind.

Firmware notes are not normalized, so "5.xx and higher" sits next to "Works on 10.xx and higher". The sidebar filter matches on the version number inside the note, so read a hit as a rough match and open the game page before downloading.

A size of 15 GB is a placeholder rather than a measurement. It marks the entries whose real size is not known yet, and the size filter has a switch to hide them.

Every filter you set ends up in the address bar, so a filtered list can be bookmarked or sent to someone and it opens for them with the same results.

## Your lists

Wishlist and collection are stored in your browser and stay there. There is no account and no sync.

Each game has a status you set on its page: None, Owned, Playing, or Backlog. The wishlist is a separate list with its own count in the header. The library page counts what you have collected and adds up the download size, and the home page shows the eight games you opened most recently.

Your theme, profile name and avatar, page size, and the other settings save in the same place, so the site comes back the way you left it.

Because all of it lives in browser storage, it does not follow you to another device, and clearing this site's data deletes it. Settings has Export and Import for a JSON file of your collection, wishlist, profile, and settings, which is how you move a library to another browser or keep a copy of it.

## Look and feel

Ten themes are in the header, from PS5 Clean white to Cyberpunk, and each one swaps the sidebar mark and the tab icon to match. Two switches in Settings turn the background orbs off and put the page into a low resource mode that drops the heavy blur and animation.

Profile avatars come from 450+ PS3 and PS4 games, kept in `assets/avatars`.

## The catalog

Everything on the site comes from `data/games.json`, one object per game:

| Field | Contents |
| --- | --- |
| `id` | Package ID, the game's real title code, such as `CUSA00900` |
| `legacyId` | Previous generated id, kept so older links and saved lists still resolve |
| `title` | Game title |
| `slug` | Title in URL form, matching the source pages |
| `description` | Short description |
| `developer`, `publisher` | Studio and publisher |
| `releaseDate` | ISO date |
| `genre` | Array of genres |
| `region` | Package region |
| `firmware` | Firmware note for the package |
| `coverImage` | Cover art URL |
| `size` | `game`, `update`, and `dlc` sizes as strings |
| `downloads` | Sources with a type, name, and URL |
| `links` | Source name mapped to its page URL |
| `password` | Archive password for the package |
| `languages` | Array of languages |

Cover art loads from images.igdb.com. Every entry links to a page on pkgps4.click, and most also have one on dlpsgame.com. Where a source has no page for a game, the game page says so instead of offering a dead link.

## How it is built

Static files with no build step and no dependencies: eight HTML pages, four stylesheets in `assets/css`, five scripts in `assets/js`, and the catalog as JSON. GitHub Pages serves the repository as it is, and no page loads an analytics or tracking script.

The scripts that build `data/games.json` and keep the sizes current sit in the repository root.

## Credit and scope

The package links, archive passwords, and firmware notes belong to the sites that publish them. This repository indexes those pages and hosts no game packages. Cover art comes from IGDB, and game titles and artwork belong to their respective owners. Nothing here is connected to Sony.
