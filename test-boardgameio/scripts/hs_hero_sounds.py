"""Scrape a hero's "Sounds" table off hearthstone.wiki.gg into .ogg + transcripts.

Downloads every .wav the table links, converts it to .ogg (libvorbis) straight
into the hero's `classHeroes/<Class>/` folder, and dumps the transcripts as JSON
so they can be pasted into `Hero.sfxText` in shared/game/data/heros.ts.

    python scripts/hs_hero_sounds.py Jaina_Proudmoore Mage
    python scripts/hs_hero_sounds.py Jaina_Proudmoore Mage --dry-run

Notes
-----
* The wiki's `{{VO|...}}` templates only expand server-side, so this reads the
  RENDERED html via api.php (`action=parse&prop=text`). Scraping /wiki/<page>
  directly gets you a Cloudflare "Blocked" page; api.php is not blocked.
* Filenames come from the wiki verbatim, which is what `heros.ts` should use.
  Beware pre-existing local files under a different spelling — Mage shipped a
  `VO_HERO_08_Well Played_57.ogg` where the wiki has `VO_HERO_08_WellPlayed_57`.
* Requires `ffmpeg` on PATH.
"""

import argparse
import html as htmllib
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_ROOT = os.path.join(
    REPO, "packages", "frontend", "public", "assets", "audio", "sfx")

# Rows that would land in `classHeroes/` as dead assets, because `Hero.sfx` has
# nowhere to put them. Pass --include-extras to pull them anyway.
#
#   - Seasonal greetings (Winter Veil, Hallow's End, ...) that swap in for the
#     normal Greetings emote during an in-game holiday: no events to key off.
#   - "Trigger:" / "Special:" rows: a hero line owned by one specific CARD, so
#     it belongs in that card's `sfx.trigger` over in cards.ts, not here.
#   - Opening lines aimed at opponents who aren't heroes in this game.
SKIP_TYPE = re.compile(
    r"^(?:Trigger|Special):"
    r"|\[(?:Lunar New Year|Happy New Year|Holidays|Fire Festival|Pirate Day"
    r"|Happy Halloween|Happy Noblegarden"
    r"|Tyrande Whisperwind|Varian Wrynn)\]", re.I)


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def strip_tags(s):
    return htmllib.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def scrape(page):
    """-> [{type, file, url, transcript}] for the page's Sounds table."""
    api = ("https://hearthstone.wiki.gg/api.php?action=parse&page="
           + urllib.parse.quote(page) + "&prop=text&formatversion=2&format=json")
    doc = json.loads(fetch(api))["parse"]["text"]

    anchor = doc.find('id="Sounds"')
    if anchor < 0:
        sys.exit("No Sounds section found on %r" % page)
    start = doc.find("<table", anchor)
    table = doc[start:doc.find("</table>", start)]

    rows = []
    for tr in re.findall(r"<tr\b[^>]*>.*?</tr>", table, re.S):
        cells = re.findall(r"<td\b[^>]*>(.*?)</td>", tr, re.S)
        if len(cells) < 3:
            continue  # header
        m = re.search(r'src="(https://[^"?]+\.wav)', cells[1])
        if not m:
            continue  # a row with no playable clip
        rows.append({
            "type": strip_tags(cells[0]),
            "file": os.path.basename(m.group(1)),
            "url": m.group(1),
            "transcript": strip_tags(cells[2]),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page", help="wiki page title, e.g. Jaina_Proudmoore")
    ap.add_argument("klass", help="classHeroes subfolder, e.g. Mage")
    ap.add_argument("--dry-run", action="store_true",
                    help="list the table without downloading or converting")
    ap.add_argument("--include-extras", action="store_true",
                    help="also pull the rows skipped by default (see SKIP_TYPE)")
    args = ap.parse_args()

    rows = scrape(args.page)
    print("%d sound rows on %s" % (len(rows), args.page))

    if not args.include_extras:
        keep = [r for r in rows if not SKIP_TYPE.search(r["type"])]
        for r in rows:
            if SKIP_TYPE.search(r["type"]):
                print("  skip  %-34s %s" % (r["type"], r["file"]))
        rows = keep

    if args.dry_run:
        for r in rows:
            print("  %-46s %-34s %s" % (r["file"], r["type"], r["transcript"]))
        return

    outdir = os.path.join(SFX_ROOT, "classHeroes", args.klass)
    wavdir = os.path.join(REPO, "scripts", ".wav_cache", args.page)
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(wavdir, exist_ok=True)

    failed = 0
    for r in rows:
        wav = os.path.join(wavdir, r["file"])
        r["ogg"] = os.path.splitext(r["file"])[0] + ".ogg"

        if not os.path.exists(wav):
            try:
                open(wav, "wb").write(fetch(r["url"], binary=True))
            except Exception as e:
                print("  DOWNLOAD FAIL %s: %s" % (r["file"], e))
                failed += 1
                continue

        rc = subprocess.run(
            ["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", wav,
             "-c:a", "libvorbis", "-q:a", "5", os.path.join(outdir, r["ogg"])],
            capture_output=True, text=True)
        if rc.returncode:
            print("  FFMPEG FAIL %s: %s" % (r["file"], rc.stderr.strip()[:120]))
            failed += 1
            continue
        print("  %-46s %-34s %s" % (r["ogg"], r["type"], r["transcript"]))

    dest = os.path.join(REPO, "scripts", "%s_sounds.json" % args.page)
    io.open(dest, "w", encoding="utf-8").write(
        json.dumps(rows, indent=2, ensure_ascii=False))
    print("\n%d ogg written to %s\ntranscripts: %s"
          % (len(rows) - failed, outdir, dest))
    if failed:
        sys.exit("%d clip(s) failed" % failed)


if __name__ == "__main__":
    main()
