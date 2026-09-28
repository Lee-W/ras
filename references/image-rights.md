# Image rights and credits

[English](image-rights.md) · [臺灣華語](../docs/image-rights-zh-tw.md)

Check every supplied or selected image before calling a deck ready. A file being
provided by the user, publicly viewable, or already credited does not establish
permission for the intended use. Attribution and permission are separate checks.

## Inventory and evidence

PAREO inventories images; MASKING verifies the evidence and final credits.
Include Markdown images, CSS backgrounds, HTML images, screenshots, logos, memes,
reference-deck images, and images embedded in diagrams. Group repeated uses under
one asset entry with all slide headings and latest page numbers in `sources.md`.

For each asset, record:

- Local path, source page or supplied document, creator and rights holder when
  identified, and the evidence checked with its date. Prefer the creator's,
  publisher's, rights holder's, or original repository's terms over a search result
  or repost. Do not infer an owner from appearance or invent a copyright line.
- Intended use: live presentation, recording, public HTML/PDF, downloadable
  sources, and commercial context as applicable. Confirm consequential gaps with
  the user; a licence for one use may not cover the others.
- The applicable licence and version, written permission, original authorship,
  public-domain basis, or other stated use basis. Record the relevant restrictions,
  including modifications, redistribution, noncommercial or share-alike terms.
  A claimed legal exception needs a documented basis for this context; do not
  certify it merely because the slide is educational or the image is a meme.
- Credit decision: `required`, `not-required`, or `unknown`, with the reason and
  exact required names, notices, links, and change indications. Keep attribution
  parties distinct from the copyright owner if the terms distinguish them.
- Exact slide credit text and placement, or the evidence for no required credit;
  record cropping, annotations, translation, and other changes where relevant.
- Outcome: `verified`, `pending`, or `replace`, with the unresolved action.
  `verified` means the recorded evidence supports the stated use and its conditions;
  it is a review conclusion, not a legal guarantee.

User-created originals can need no third-party credit; record that basis instead
of adding a fictitious owner. AI-generated images still need a record of the tool,
applicable terms, supplied reference assets, and any unresolved third-party rights.
Do not label them automatically copyright-free. For screenshots and logos, check
the underlying content and applicable terms, not just who captured the screenshot.

## Visible credits

Place required credits on the relevant slide using `.credit`, unless the actual
terms allow another suitable placement such as a clearly mapped credits slide.
Retain specified wording and required links/notices; do not assume an invented
`© owner` label is sufficient. For example, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
requires attribution, a licence link, and an indication of changes, with additional
supplied notices to retain. Read the particular licence rather than treating all
Creative Commons licences alike.

`sources.md` preserves the evidence; it does not replace audience-visible credits.
Speaker notes and HTML comments do not survive into the audience PDF. Check the
actual final HTML and PDF for readable, uncropped credits, preserved notices, and
working required links. Preserve existing watermarks and attribution; if a crop
would remove them, verify permission and choose another crop or asset as needed.

## Missing evidence and review

If browsing or the source terms are unavailable, request the source/licence or
permission evidence and mark the asset `pending`. Never infer a pass from a build
or a missing copyright symbol. Continue drafting with an explicit placeholder or
a verified alternative; do not silently swap a user-selected image.

Do not call the deck `READY` or record a passing factual review while an included
image has unknown use rights or required credits are missing. Use `UNVERIFIED`
for missing evidence and `NEEDS_CHANGES` for a known conflict or missing required
credit. Include asset IDs, page coverage, evidence and outcomes in the factual
review observations, and inspect credit placement in the visual review.

Create and revise perform this check for new and changed images and recheck when
the use context changes. Review audits all included images; export verifies a
matching prior image-rights review or reports the gap. A prior factual pass without
image-rights evidence is insufficient. Draft exports remain possible with honest
pending/needs-changes status. The scripts validate review record structure and
freshness; they do not determine image ownership or read licence terms themselves.

In chat-only mode, record only supplied evidence and provide proposed credits;
do not claim browsing or visual inspection. Report what still needs verification.
