#!/usr/bin/env python3
"""
hs_card_builder.py — scrape a Hearthstone card from hearthstone.wiki.gg and emit
a ready-to-paste cardTemplates entry, plus the processed art and .ogg SFX.

Usage
-----
    python hs_card_builder.py "Dust Devil"
    python hs_card_builder.py "Dust Devil" "Earth Elemental" "Lightning Bolt"
    python hs_card_builder.py "Dust Devil, Earth Elemental"     # one quoted list
    python hs_card_builder.py https://hearthstone.wiki.gg/wiki/Dust_Devil
    python hs_card_builder.py --batch cards.txt
    python hs_card_builder.py --batch cards.txt --out src/data/output.ts --append
    python hs_card_builder.py "Dust Devil" --debug          # show every scraped field
    python hs_card_builder.py "Dust Devil" --no-audio       # skip sound download
    python hs_card_builder.py "Dust Devil" --print-only     # nothing written to disk

What it does
------------
1. Resolves the card name (or URL) to a wiki page, using the wiki's own search
   as a fallback for near-misses / disambiguation.
2. Scrapes stats, text, class, set, rarity, minion type, keywords, ids, flavor.
3. Downloads the "_full" gallery art, resizes so max dimension is 700px, saves
   as JPEG q80 to  <assets>/cards/<Page_Name>.jpg
4. Downloads the Play / Attack / Death / Trigger .wav sounds, converts them to
   .ogg with ffmpeg, saves to  <public>/cards/<file>.ogg  and deletes the .wav
   files. ("Trigger" is the voice line a minion plays when its "whenever…"
   clause fires — Nat Pagle, Ragnaros, Antonidas.)
5. Writes a TypeScript cardTemplates entry per card into ./output.ts (--out),
   and a .json sidecar per card with everything it scraped (for auditing).

Requires:  pip install requests beautifulsoup4 pillow      +  ffmpeg on PATH
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

try:
    from PIL import Image
except ImportError:  # image step is optional
    Image = None

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

WIKI = "https://hearthstone.wiki.gg"
FILEPATH = WIKI + "/wiki/Special:FilePath/"  # stable redirect to the original file
API = WIKI + "/api.php"
HEADERS = {"User-Agent": "hs-card-builder/1.0 (personal card-import tool)"}

MAX_IMAGE_SIZE = 700
JPEG_QUALITY = 80
OGG_QUALITY = "5"

ROOT = Path(__file__).parent
ART_DIR = ROOT / "assets" / "cards"      # matches imageUrl: "assets/cards/X.jpg"
SFX_DIR = ROOT / "assets" / "audio" / "sfx" / "cards"      # matches sfxShortener: `/cards/${sfx}`
DATA_DIR = ROOT / "scraped"              # json sidecars
TMP_DIR = ROOT / ".hs_tmp"

# Full-tags flag  ->  Card boolean field
KEYWORD_FLAGS = {
    "TAUNT": "taunt",
    "DIVINE_SHIELD": "divineShield",
    "STEALTH": "stealth",
    "CHARGE": "charge",
    "RUSH": "rush",
    "POISONOUS": "poisonous",
    "WINDFURY": "windfury",
    "FREEZE": "frozen",
}

# Infobox labels we look for, mapped to a short key
LABELS = {
    "Class:": "class",
    "Card type:": "card_type",
    "Cost:": "cost",
    "Attack:": "attack",
    "Health:": "health",
    "Durability:": "durability",
    "Armor:": "armor",
    "Minion type:": "minion_type",
    "Spell school:": "spell_school",
    "Card set:": "card_set",
    "Rarity:": "rarity",
    "Card id:": "card_id",
    "dbfId:": "dbf_id",
    "Race:": "race",
    "Artist:": "artist",
    "Tribe:": "minion_type",
    "Formats:": "formats",
}
LABEL_LINES = set(LABELS) | {"Keywords", "Full tags", "Wiki mechanics", "Flavor",
                             "Availability", "Sounds", "Contents", "Gallery"}

# Order matters: this is the positional argument order of the `sfx()` helper in
# data/cards.ts — sfx(play, attack, death, trigger).
SOUND_BUCKETS = ("play", "attack", "death", "trigger")


# --------------------------------------------------------------------------- #
# Scraped model
# --------------------------------------------------------------------------- #

@dataclass
class CardData:
    page_title: str = ""
    page_url: str = ""
    card_id: str = ""          # e.g. EX1_243
    dbf_id: str = ""
    card_type: str = ""        # Minion / Spell / Weapon / Hero / Location
    text: str = ""             # card description
    flavor: str = ""
    artist: str = ""
    cost: int | None = None
    attack: int | None = None
    health: int | None = None
    durability: int | None = None
    armor: int | None = None
    hero_class: str = "Neutral"
    minion_type: list[str] = field(default_factory=list)
    spell_school: str = ""
    card_set: list[str] = field(default_factory=list)
    rarity: str = ""
    collectible: bool = True
    mechanics: list[str] = field(default_factory=list)   # human-readable, -> tags
    flags: dict[str, bool] = field(default_factory=dict)  # taunt/windfury/...
    overload: int | None = None
    spell_damage: int | None = None
    full_art_file: str = ""                              # File:Dust_Devil_full.jpg
    sounds: dict[str, list[str]] = field(default_factory=dict)  # bucket -> filenames
    warnings: list[str] = field(default_factory=list)

    # filled in by the asset steps
    image_path: str = ""
    ogg_files: dict[str, list[str]] = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Fetching
# --------------------------------------------------------------------------- #

def session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def resolve_page(s: requests.Session, query: str) -> str:
    """Turn a card name or URL into a wiki page URL."""
    if query.startswith("http://") or query.startswith("https://"):
        return query

    guess = f"{WIKI}/wiki/{quote(query.strip().replace(' ', '_'))}"
    r = s.get(guess, timeout=20)
    if r.status_code == 200 and "Wikipedia does not have" not in r.text:
        # A real card page always has an infobox "Card type:" label.
        if "Card type" in r.text:
            return r.url

    # Fall back to the wiki search API.
    try:
        r = s.get(API, params={
            "action": "query", "format": "json", "list": "search",
            "srsearch": query, "srlimit": 5, "srnamespace": 0,
        }, timeout=20)
        hits = r.json().get("query", {}).get("search", [])
    except Exception:
        hits = []

    if not hits:
        raise SystemExit(f"Could not find a wiki page for {query!r}.")

    title = hits[0]["title"]
    if title.lower() != query.strip().lower():
        print(f"  ~ no exact page for {query!r}; using closest match: {title!r}")
        others = [h["title"] for h in hits[1:]]
        if others:
            print(f"    (other candidates: {', '.join(others)})")
    return f"{WIKI}/wiki/{quote(title.replace(' ', '_'))}"


def fetch_soup(s: requests.Session, url: str) -> tuple[BeautifulSoup, str]:
    r = s.get(url, timeout=25)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    return soup, r.url


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #

def text_lines(soup: BeautifulSoup) -> list[str]:
    """The page as a flat list of non-empty text lines (block + inline aware)."""
    content = soup.select_one("#mw-content-text") or soup
    raw = content.get_text("\n", strip=True)
    return [ln.strip() for ln in raw.split("\n") if ln.strip()]


def label_values(lines: list[str]) -> dict[str, list[str]]:
    """Collect the lines following each recognised 'Label:' line."""
    out: dict[str, list[str]] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        key = LABELS.get(line)
        if key:
            vals: list[str] = []
            j = i + 1
            while j < len(lines) and lines[j] not in LABEL_LINES:
                vals.append(lines[j])
                j += 1
            # de-dupe while preserving order (icon links repeat their label)
            seen, uniq = set(), []
            for v in vals:
                if v not in seen:
                    seen.add(v)
                    uniq.append(v)
            out.setdefault(key, uniq)
            i = j
        else:
            i += 1
    return out


def first_int(values: list[str] | None) -> int | None:
    if not values:
        return None
    for v in values:
        m = re.search(r"-?\d+", v)
        if m:
            return int(m.group())
    return None


def first_str(values: list[str] | None) -> str:
    return values[0] if values else ""


def extract_card_text(lines: list[str]) -> str:
    """
    Card body text sits between the Collectible/Uncollectible marker and the
    first infobox label. e.g.  ... 'Collectible', 'Windfury. Overload: (2)', 'Class:'
    """
    for i, ln in enumerate(lines):
        if ln in ("Collectible", "Uncollectible"):
            body = []
            for nxt in lines[i + 1:]:
                if nxt in LABEL_LINES:
                    break
                body.append(nxt)
            return clean_text(" ".join(body))
    return ""


def extract_flavor(lines: list[str]) -> str:
    for i, ln in enumerate(lines):
        if ln == "Flavor":
            for nxt in lines[i + 1:]:
                if nxt in LABEL_LINES:
                    break
                return nxt
    return ""


def extract_mechanics(lines: list[str]) -> list[str]:
    """The 'Wiki mechanics' row: human-readable keyword names -> tags."""
    for i, ln in enumerate(lines):
        if ln == "Wiki mechanics":
            out = []
            for nxt in lines[i + 1:]:
                if nxt in LABEL_LINES or re.fullmatch(r"[A-Z_0-9=\s]+", nxt):
                    break
                out.extend(p.strip() for p in nxt.split(",") if p.strip())
            return out
    return []


def extract_flags(page_text: str) -> tuple[dict[str, bool], bool, int | None, int | None]:
    """Read the machine-readable 'Full tags' block: RARITY=1 WINDFURY=1 ..."""
    tags = dict(re.findall(r"\b([A-Z][A-Z_0-9]*)=(-?\d+)\b", page_text))
    flags = {field: True for tag, field in KEYWORD_FLAGS.items()
             if tags.get(tag, "0") != "0"}
    collectible = tags.get("COLLECTIBLE", "0") != "0"
    spell_damage = int(tags["SPELLPOWER"]) if tags.get("SPELLPOWER") else None
    overload = int(tags["OVERLOAD_OWED"]) if tags.get("OVERLOAD_OWED") else None
    return flags, collectible, overload, spell_damage


def extract_overload(text: str) -> int | None:
    m = re.search(r"Overload:?\s*\(?(\d+)\)?", text, re.I)
    return int(m.group(1)) if m else None


def extract_full_art(soup: BeautifulSoup, page_title: str) -> str:
    """Find the File: name of the '_full' gallery art."""
    candidates = []
    for a in soup.select("#mw-content-text a[href*='/wiki/File:']"):
        name = unquote(a["href"].split("/wiki/File:", 1)[1].split("#")[0])
        if re.search(r"_full\d*\.(jpe?g|png)$", name, re.I):
            candidates.append(name)
    if candidates:
        # prefer the one matching the page name, else the shortest
        exact = [c for c in candidates
                 if c.lower().startswith(page_title.replace(" ", "_").lower())]
        return (exact or sorted(candidates, key=len))[0]
    return f"{page_title.replace(' ', '_')}_full.jpg"


def extract_sounds(soup: BeautifulSoup) -> dict[str, list[str]]:
    """
    Walk the Sounds section, bucketing .wav files by the sub-heading above them
    (Play / Attack / Death). Falls back to filename heuristics — same rules as
    your ogg_sfx_sorter.html.
    """
    heading = soup.find(id="Sounds")
    if heading is None:
        return {}
    start = heading.find_parent(["h1", "h2", "h3", "h4"]) or heading

    buckets: dict[str, list[str]] = {b: [] for b in SOUND_BUCKETS}
    current = None

    for el in start.find_all_next():
        # stop at the next same-or-higher-level section
        if el.name in ("h1", "h2") and el is not start:
            break
        if el.name in ("h3", "h4", "dt", "b", "strong"):
            label = el.get_text(strip=True).lower().rstrip(":")
            if label in SOUND_BUCKETS:
                current = label
            continue

        href = el.get("href") or el.get("src") if el.name in ("a", "audio", "source") else None
        if not href:
            continue
        fname = unquote(Path(urlparse(href).path).name)
        if not fname.lower().endswith(".wav"):
            continue
        bucket = current or categorize(fname)
        if bucket in buckets and fname not in buckets[bucket]:
            buckets[bucket].append(fname)

    # Some pages list filenames as plain text with no link — pick those up too.
    if not any(buckets.values()):
        region = start.find_next("h2")
        blob = start.parent.get_text(" ", strip=True) if region is None else ""
        for fname in re.findall(r"[\w.\-()]+\.wav", blob):
            b = categorize(fname)
            if b in buckets and fname not in buckets[b]:
                buckets[b].append(fname)

    return {k: v for k, v in buckets.items() if v}


def categorize(name: str) -> str:
    """
    Mirror of the SFX Sorter's filename rules. Only a fallback — pages that use
    the usual <dt>Play / <dt>Trigger / ... headings are bucketed by heading.

    "trigger" is checked before "play" because the voice lines are named
    VO_<id>_Trigger_NN.wav and would otherwise fall through to "other".
    """
    n = name.lower()
    if "attack" in n:
        return "attack"
    if "death" in n:
        return "death"
    if "trigger" in n:
        return "trigger"
    if any(k in n for k in ("play", "stinger", "enterplay", "summon", "greet")):
        return "play"
    return "other"


# --------------------------------------------------------------------------- #
# Scrape
# --------------------------------------------------------------------------- #

def scrape(s: requests.Session, query: str) -> CardData:
    url = resolve_page(s, query)
    soup, final_url = fetch_soup(s, url)

    h1 = soup.select_one("#firstHeading, h1.firstHeading, h1")
    page_title = h1.get_text(strip=True) if h1 else query

    lines = text_lines(soup)
    page_text = " ".join(lines)
    vals = label_values(lines)

    flags, collectible, ol_tag, spell_damage = extract_flags(page_text)
    card_text = extract_card_text(lines)

    d = CardData(
        page_title=page_title,
        page_url=final_url,
        card_id=first_str(vals.get("card_id")),
        dbf_id=first_str(vals.get("dbf_id")),
        card_type=first_str(vals.get("card_type")),
        text=card_text,
        flavor=extract_flavor(lines),
        artist=first_str(vals.get("artist")),
        cost=first_int(vals.get("cost")),
        attack=first_int(vals.get("attack")),
        health=first_int(vals.get("health")),
        durability=first_int(vals.get("durability")),
        armor=first_int(vals.get("armor")),
        hero_class=first_str(vals.get("class")) or "Neutral",
        minion_type=[t for t in vals.get("minion_type", []) if t],
        spell_school=first_str(vals.get("spell_school")),
        card_set=[t for t in vals.get("card_set", []) if t][:1],
        rarity=first_str(vals.get("rarity")),
        collectible=collectible,
        mechanics=extract_mechanics(lines),
        flags=flags,
        overload=extract_overload(card_text) or ol_tag,
        spell_damage=spell_damage,
        full_art_file=extract_full_art(soup, page_title),
        sounds=extract_sounds(soup),
    )

    if not d.card_type:
        d.warnings.append("card type not found — page layout may have changed")
    if d.cost is None:
        d.warnings.append("mana cost not found")
    if not d.text and d.card_type.lower() != "minion":
        d.warnings.append("no card text scraped — check the description by hand")
    if not d.sounds:
        d.warnings.append("no sound files found on the page")
    return d


# --------------------------------------------------------------------------- #
# Assets
# --------------------------------------------------------------------------- #

def download(s: requests.Session, file_name: str, dest: Path) -> Path | None:
    """Download a wiki File: by name via Special:FilePath (follows redirects)."""
    url = FILEPATH + quote(file_name.replace(" ", "_"))
    try:
        with s.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
        return dest
    except requests.RequestException as e:
        print(f"  x could not download {file_name}: {e}")
        return None


def process_art(s: requests.Session, d: CardData, art_dir: Path) -> None:
    if Image is None:
        d.warnings.append("Pillow not installed — art not processed")
        return

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    src = download(s, d.full_art_file, TMP_DIR / d.full_art_file)
    if src is None:
        d.warnings.append(f"full art {d.full_art_file} not downloaded")
        return

    stem = re.sub(r"_full\d*$", "", Path(d.full_art_file).stem).rstrip("_")
    out = art_dir / f"{stem}.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(src) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) > MAX_IMAGE_SIZE:
            if w >= h:
                img = img.resize((MAX_IMAGE_SIZE, int(h * MAX_IMAGE_SIZE / w)), Image.LANCZOS)
            else:
                img = img.resize((int(w * MAX_IMAGE_SIZE / h), MAX_IMAGE_SIZE), Image.LANCZOS)
        img.save(out, "JPEG", quality=JPEG_QUALITY)
        print(f"  + art  {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out} "
              f"({img.size[0]}x{img.size[1]})")

    src.unlink(missing_ok=True)
    d.image_path = f"assets/cards/{stem}.jpg"


def process_sounds(s: requests.Session, d: CardData, sfx_dir: Path) -> None:
    if shutil.which("ffmpeg") is None:
        d.warnings.append("ffmpeg not on PATH — sounds not converted")
        return

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    sfx_dir.mkdir(parents=True, exist_ok=True)

    for bucket, files in d.sounds.items():
        for wav_name in files:
            wav = download(s, wav_name, TMP_DIR / wav_name)
            if wav is None:
                continue
            ogg = sfx_dir / f"{Path(wav_name).stem}.ogg"
            res = subprocess.run(
                ["ffmpeg", "-y", "-i", str(wav), "-c:a", "libvorbis",
                 "-q:a", OGG_QUALITY, str(ogg)],
                capture_output=True, text=True,
            )
            if res.returncode == 0:
                d.ogg_files.setdefault(bucket, []).append(ogg.name)
                print(f"  + sfx  {bucket:<6} {ogg.name}")
                wav.unlink(missing_ok=True)
            else:
                tail = res.stderr.strip().splitlines()[-1] if res.stderr else "unknown error"
                print(f"  x ffmpeg failed on {wav_name}: {tail}")
                d.warnings.append(f"conversion failed: {wav_name} (.wav kept)")


# --------------------------------------------------------------------------- #
# TypeScript emitter
# --------------------------------------------------------------------------- #

def kebab(name: str) -> str:
    s = re.sub(r"[’']", "", name)
    s = re.sub(r"[^A-Za-z0-9]+", "-", s)
    return s.strip("-").lower()


def ts_key(name: str) -> str:
    k = kebab(name)
    return k if re.fullmatch(r"[a-z][a-z0-9]*", k) else f'"{k}"'


def ts_string(v: str) -> str:
    return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'


def ts_array(items: list[str]) -> str:
    return "[" + ", ".join(ts_string(i) for i in items) + "]"


def clean_text(t: str) -> str:
    """Normalise wiki card text into the description string you use."""
    t = t.replace("\u00a0", " ")
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    # <b>Windfury</b>. splits into two text nodes, leaving "Windfury ."
    t = re.sub(r"\s+([.,!?:;)])", r"\1", t)
    t = re.sub(r"(\()\s+", r"\1", t)
    return t.strip()


def emit_ts(d: CardData) -> str:
    kind = d.card_type.lower()
    is_minion = kind == "minion"
    is_spell = kind == "spell"
    is_weapon = kind == "weapon"

    L: list[str] = []
    add = L.append

    add(f"  {ts_key(d.page_title)}: {{")
    add(f"    title: {ts_string(d.page_title)},")
    add(f"    description: {ts_string(clean_text(d.text))},")
    add(f"    baseMana: {d.cost if d.cost is not None else 'undefined'},")

    if is_minion:
        add(f"    baseAttack: {d.attack if d.attack is not None else 'undefined'},")
        add(f"    baseHealth: {d.health if d.health is not None else 'undefined'},")
    elif is_weapon:
        add(f"    baseAttack: {d.attack if d.attack is not None else 'undefined'},")
        add(f"    baseDurability: {d.durability if d.durability is not None else 'undefined'},")
    else:
        add("    baseAttack: undefined,")
        add("    baseHealth: undefined,")

    if d.overload:
        add(f"    overload: {d.overload},")
    for f in ("taunt", "divineShield", "stealth", "charge", "rush", "poisonous", "windfury"):
        if d.flags.get(f):
            add(f"    {f}: true,")

    types = d.minion_type or ([d.spell_school] if d.spell_school else [])
    if types:
        add(f"    type: {ts_array(types)},")
    if d.mechanics:
        add(f"    tags: {ts_array(d.mechanics)},")

    art = d.image_path or f"assets/cards/{re.sub(r'_full\d*$', '', Path(d.full_art_file).stem)}.jpg"
    add(f"    imageUrl: {ts_string(art)},")

    # --- effects ------------------------------------------------------------
    if is_minion:
        add("    effects: [")
        add("      damage({")
        add('        stat: "attack",')
        add('        type: "card-stat",')
        add("      }),")
        add("    ],")
    else:
        add("    effects: [], // TODO: author from the card text")

    body = clean_text(d.text)
    battlecry = re.search(r"Battlecry:\s*(.+?)(?:$|\.\s)", body, re.I)
    deathrattle = re.search(r"Deathrattle:\s*(.+?)(?:$|\.\s)", body, re.I)
    if battlecry:
        add(f"    onPlace: [], // TODO Battlecry: {battlecry.group(1).strip()}")
    else:
        add("    onPlace: [],")
    if deathrattle:
        add(f"    deathrattle: [], // TODO Deathrattle: {deathrattle.group(1).strip()}")

    # --- targeting ----------------------------------------------------------
    add("    targetQuery: {")
    add(f'      side: "{"enemy" if is_minion or is_weapon else "all"}",')
    add('      type: ["card", "player"],')
    add("    },")
    if battlecry:
        add("    battlecryQuery: {")
        add('      side: "enemy",')
        add('      type: ["card", "player"],')
        add('      conditions: [{ type: "exclude-self" }],')
        add("    },")

    add(f"    isMinion: {str(is_minion).lower()},")
    if is_spell:
        add("    isSpell: true,")
    if is_weapon:
        add("    isWeapon: true,")
    if not d.collectible:
        add("    isUncollectible: true,")
    if d.rarity in ("Common", "Rare", "Epic", "Legendary"):
        add(f'    rarity: "{d.rarity}",')
    add(f"    class: {ts_string(d.hero_class)},")
    if d.card_set:
        add(f"    set: {ts_array(d.card_set)},")

    # --- sfx ----------------------------------------------------------------
    src = d.ogg_files or {k: [f"{Path(n).stem}.ogg" for n in v] for k, v in d.sounds.items()}
    if src:
        # sfx() takes its buckets positionally, so a later one forces every
        # earlier one to be written out — drop only the trailing empties.
        buckets = [src.get(b, []) for b in SOUND_BUCKETS]
        while buckets and not buckets[-1]:
            buckets.pop()
        if buckets:
            add("    sfx: sfx(")
            for arr in buckets:
                add(f"      {ts_array(arr)},")
            add("    ),")

    add("  },")
    return "\n".join(L)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def build_one(s: requests.Session, query: str, args) -> CardData:
    print(f"\n=== {query} ===")
    d = scrape(s, query)
    print(f"  page: {d.page_url}")
    print(f"  {d.card_type or '?'} | {d.hero_class} | "
          f"{d.cost}/{d.attack}/{d.health} | {d.rarity or '?'} | {d.card_id or '?'}")

    if not args.print_only:
        if not args.no_image:
            process_art(s, d, args.assets / "cards")
        if not args.no_audio:
            process_sounds(s, d, args.public / "cards")

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        (DATA_DIR / f"{kebab(d.page_title)}.json").write_text(
            json.dumps(asdict(d), indent=2), encoding="utf-8")

    if args.debug:
        print("\n--- scraped ---")
        print(json.dumps(asdict(d), indent=2))

    for w in d.warnings:
        print(f"  ! {w}")
    return d


def main() -> None:
    p = argparse.ArgumentParser(description="Build cardTemplates entries from hearthstone.wiki.gg")
    p.add_argument("cards", nargs="*", help="card names and/or wiki URLs (also accepts comma-separated)")
    p.add_argument("--batch", type=Path, help="text file with one card name/URL per line")
    p.add_argument("--out", type=Path, default=ROOT / "output.ts",
                   help="TS file to write the entries to (default ./output.ts)")
    p.add_argument("--append", action="store_true",
                   help="append to --out instead of overwriting it")
    p.add_argument("--stdout", action="store_true",
                   help="also print the entries to the terminal")
    p.add_argument("--assets", type=Path, default=ART_DIR.parent, help="assets root (default ./assets)")
    p.add_argument("--public", type=Path, default=SFX_DIR.parent, help="public root (default ./public)")
    p.add_argument("--no-image", action="store_true")
    p.add_argument("--no-audio", action="store_true")
    p.add_argument("--print-only", action="store_true", help="scrape and print, write nothing")
    p.add_argument("--debug", action="store_true", help="dump every scraped field")
    args = p.parse_args()

    queries: list[str] = []
    for raw in args.cards:
        # allow "Dust Devil, Earth Elemental" as a single quoted argument,
        # but don't split URLs (they never contain a bare comma + space)
        parts = [raw] if raw.startswith("http") else re.split(r"\s*,\s*", raw)
        queries += [pt.strip() for pt in parts if pt.strip()]
    if args.batch:
        queries += [ln.strip() for ln in args.batch.read_text().splitlines()
                    if ln.strip() and not ln.startswith("#")]
    if not queries:
        p.error("give at least one card name/URL, or --batch")

    # de-dupe while keeping order, so a batch file with repeats is harmless
    seen, uniq = set(), []
    for q in queries:
        if q.lower() not in seen:
            seen.add(q.lower())
            uniq.append(q)
    queries = uniq

    s = session()
    snippets, failures = [], []
    for q in queries:
        try:
            snippets.append(emit_ts(build_one(s, q, args)))
        except Exception as e:
            print(f"  x {q}: {e}")
            failures.append(q)

    if TMP_DIR.exists() and not any(TMP_DIR.iterdir()):
        TMP_DIR.rmdir()

    body = "\n".join(snippets)

    if args.print_only or args.stdout:
        print("\n" + "=" * 66)
        print("// paste into cardTemplates in data/cards.ts")
        print("=" * 66)
        print(body)

    if snippets and not args.print_only:
        header = (
            "// Generated by hs_card_builder.py — fragment of cardTemplates entries.\n"
            "// Not standalone TS: `damage()` / `sfx()` and friends live in data/cards.ts,\n"
            "// so expect editor errors here until these are pasted in.\n"
        )
        args.out.parent.mkdir(parents=True, exist_ok=True)
        if args.append and args.out.exists():
            with open(args.out, "a", encoding="utf-8") as f:
                f.write("\n" + body + "\n")
            verb = "appended to"
        else:
            args.out.write_text(header + "\n" + body + "\n", encoding="utf-8")
            verb = "wrote"
        print(f"\n{verb} {len(snippets)} entr{'y' if len(snippets) == 1 else 'ies'} "
              f"-> {args.out.resolve()}")

    if failures:
        print(f"\nFailed: {', '.join(failures)}")
        sys.exit(1)


if __name__ == "__main__":
    main()