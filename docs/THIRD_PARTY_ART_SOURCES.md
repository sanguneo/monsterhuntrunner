# Creature anatomical source provenance

The ghost girl, Dracula and Sea Witch head derivatives use official MakeHuman graphical core data under CC0. The underlying anatomical mesh is not claimed to be wholly original. No MakeHuman application code is included.

- Repository: https://github.com/makehumancommunity/makehuman
- Core mesh: `makehuman/data/3dobjs/base.obj`, Git blob `d26635e9326e3cca30778fd7b9c00062b03cce09`.
- Local source: `scripts/art/reference-data/makehuman-base.obj`.
- Asset license: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md
- Local license text: `scripts/art/reference-data/MAKEHUMAN-LICENSE-ASSETS.md`.
- Morph source paths and exact Git blobs: `scripts/art/reference-data/target-provenance.json`. Source target filenames do not imply a character's ethnicity.

The ghost-girl authoring recipe blends the three female-young targets equally at total strength 0.7. Dracula blends the three male-young targets equally at total strength 1.0. Sea Witch blends the three female-young targets equally at total strength 1.0. The authoring scripts crop and style the heads, fit their eye anchors, close the lower necks and export reduced Float32 runtime geometry. Fitted scalp/crown surfaces derived from this anatomy retain the same CC0 provenance.

Recipes are retained in `scripts/art/author-school-specter-anatomical.py`, `scripts/art/author-dracula-anatomical-v4.py`, `scripts/art/author-sea-witch-cc0-study.py`, `scripts/art/prepare-sea-witch-cc0-runtime.py`, and the corresponding crown-fitting scripts. Their original high-detail editing scenes remain in the preserved source/model archives. These source records do not establish final visual acceptance.
