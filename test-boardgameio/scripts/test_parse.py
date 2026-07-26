#!/usr/bin/env python3
"""Offline test of the parsers against a fixture that mirrors the real page."""
import json
from dataclasses import asdict
from bs4 import BeautifulSoup

import hs_card_builder as B

FIXTURE = """
<div id="mw-content-text"><div class="mw-parser-output">
<h1 id="firstHeading">Dust Devil</h1>
<div class="card-info">
<div><a href="/wiki/File:EX1_243.png"><img src="/images/thumb/EX1_243.png/300px-EX1_243.png"></a></div>
<p><i>Artist: <a href="/wiki/Raymond_Swanland">Raymond Swanland</a></i></p>
<div>Collectible</div>
<p><b>Windfury</b>. <b>Overload:</b> (2)</p>
<h3>Class:</h3><div><a href="/wiki/Shaman">Shaman</a></div>
<h3>Card type:</h3><div><a href="/wiki/Minion">Minion</a></div>
<h3>Cost:</h3><div>1 <img alt="Mana" src="/images/Mana_icon.png"></div>
<h3>Attack:</h3><div>3 <img alt="Attack" src="/images/Attack_icon.png"></div>
<h3>Health:</h3><div>1 <img alt="Health" src="/images/Health.png"></div>
<h3>Minion type:</h3><div><a href="/wiki/Elemental">Elemental</a></div>
<h3>Card set:</h3><div><a href="/wiki/Legacy"><img src="/images/HoF.svg"></a><a href="/wiki/Legacy">Legacy</a></div>
<h3>Rarity:</h3><div><a href="/wiki/Rarity"><img alt="Common" src="/images/Common.png"></a> <a href="/wiki/Rarity">Common</a></div>
<p><i>Keywords</i></p>
<table><tr><td><code>OVERLOAD</code> <code>WINDFURY</code></td></tr></table>
<p><i>Full tags</i></p>
<table><tr><td><code>RARITY=1</code> <code>CLASS=8</code> <code>COST=1</code> <code>HEALTH=1</code>
<code>ATK=3</code> <code>CARDTYPE=4</code> <code>CARDRACE=18</code> <code>OVERLOAD=1</code>
<code>WINDFURY=1</code> <code>COLLECTIBLE=1</code></td></tr></table>
<p><i>Wiki mechanics</i></p>
<table><tr><td><a href="/wiki/Overload">Overload</a>, <a href="/wiki/Windfury">Windfury</a></td></tr></table>
<h2><span id="Availability">Availability</span></h2>
<h3>Formats:</h3><div>Wild</div>
<h2><span id="Flavor">Flavor</span></h2>
<p><i>Westfall is full of dust devils. And buzzards. Why does anyone live here?</i></p>
<h3>Race:</h3><div><a href="/wiki/Elemental_art">Elemental</a></div>
<h3>dbfId:</h3><div><code>618</code></div>
<h3>Card id:</h3><div><code>EX1_243</code></div>
</div>

<h2><span id="Sounds">Sounds</span></h2>
<h3>Play</h3>
<ul><li><a href="/images/EX1_243_Dust_Devil_EnterPlay1.wav">&#9654;</a>
  <code>EX1_243_Dust_Devil_EnterPlay1.wav</code> &lt;summon sound&gt;</li></ul>
<h3>Attack</h3>
<ul><li><a href="/images/8/8a/EX1_243_Dust_Devil_Attack3.wav">&#9654;</a>
  <code>EX1_243_Dust_Devil_Attack3.wav</code></li></ul>
<h3>Death</h3>
<ul><li><audio><source src="/images/EX1_243_Dust_Devil_Death3.wav"></audio>
  <code>EX1_243_Dust_Devil_Death3.wav</code></li></ul>

<h2><span id="Gallery">Gallery</span></h2>
<ul class="gallery"><li>
  <a href="/wiki/File:Dust_Devil_full.jpg"><img src="/images/thumb/Dust_Devil_full.jpg/305px-Dust_Devil_full.jpg"></a>
  <div>Dust Devil, full art</div>
</li></ul>
</div></div>
"""

soup = BeautifulSoup(FIXTURE, "html.parser")
lines = B.text_lines(soup)
page_text = " ".join(lines)
vals = B.label_values(lines)
flags, collectible, ol_tag, sd = B.extract_flags(page_text)

d = B.CardData(
    page_title="Dust Devil",
    page_url="https://hearthstone.wiki.gg/wiki/Dust_Devil",
    card_id=B.first_str(vals.get("card_id")),
    dbf_id=B.first_str(vals.get("dbf_id")),
    card_type=B.first_str(vals.get("card_type")),
    text=B.extract_card_text(lines),
    flavor=B.extract_flavor(lines),
    artist=B.first_str(vals.get("artist")),
    cost=B.first_int(vals.get("cost")),
    attack=B.first_int(vals.get("attack")),
    health=B.first_int(vals.get("health")),
    hero_class=B.first_str(vals.get("class")) or "Neutral",
    minion_type=[t for t in vals.get("minion_type", []) if t],
    card_set=[t for t in vals.get("card_set", []) if t][:1],
    rarity=B.first_str(vals.get("rarity")),
    collectible=collectible,
    mechanics=B.extract_mechanics(lines),
    flags=flags,
    overload=B.extract_overload(B.extract_card_text(lines)) or ol_tag,
    full_art_file=B.extract_full_art(soup, "Dust Devil"),
    sounds=B.extract_sounds(soup),
)

print(json.dumps(asdict(d), indent=2))
print("\n" + "=" * 60 + "\n")
d.ogg_files = {k: [f"{v[0].rsplit('.',1)[0]}.ogg"] for k, v in d.sounds.items()}
print(B.emit_ts(d))

expected = dict(cost=1, attack=3, health=1, card_id="EX1_243", card_type="Minion",
                hero_class="Shaman", rarity="Common", overload=2)
for k, v in expected.items():
    got = getattr(d, k)
    assert got == v, f"FAIL {k}: expected {v!r}, got {got!r}"
assert d.flags.get("windfury"), "windfury flag missing"
assert d.minion_type == ["Elemental"], d.minion_type
assert d.card_set == ["Legacy"], d.card_set
assert d.mechanics == ["Overload", "Windfury"], d.mechanics
assert d.full_art_file == "Dust_Devil_full.jpg", d.full_art_file
assert d.text.startswith("Windfury. Overload: (2)"), repr(d.text)
assert list(d.sounds) == ["play", "attack", "death"], d.sounds
print("\nALL ASSERTIONS PASSED")
