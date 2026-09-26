# Dependency pins

[English](dependencies.md) · [臺灣華語](dependencies-zh-tw.md)

Verified against upstream release notes and maintainer advisories on 2026-09-24.

## XML parsing

`speech-rule-engine` pins `@xmldom/xmldom` to 0.9.10. The root override selects
0.9.12. Its [release notes](https://github.com/xmldom/xmldom/releases/tag/0.9.12)
list the following security fixes; the CVE identifiers come from the linked
maintainer advisories. These describe the dependency, not demonstrated RAS exploits.

| CVE | Fixed behavior |
| --- | --- |
| [CVE-2026-83608](https://github.com/xmldom/xmldom/security/advisories/GHSA-27p8-2357-5qqv) | Validate document-type names during strict serialization |
| [CVE-2026-83609](https://github.com/xmldom/xmldom/security/advisories/GHSA-3px3-54cx-rmw9) | Reject line terminators in names at creation |
| [CVE-2026-83610](https://github.com/xmldom/xmldom/security/advisories/GHSA-6gmq-8vp8-gcm6) | Validate entity-reference names |
| [CVE-2026-83611](https://github.com/xmldom/xmldom/security/advisories/GHSA-6h8r-xr42-gp59) | Report malformed closing tags |
| [CVE-2026-83612](https://github.com/xmldom/xmldom/security/advisories/GHSA-6mj3-qw4j-hgrw) | Prevent amplification while parsing HTML raw text |
| [CVE-2026-83613](https://github.com/xmldom/xmldom/security/advisories/GHSA-8344-3jmq-59r6) | Deduplicate attributes in linear time |
| [CVE-2026-83614](https://github.com/xmldom/xmldom/security/advisories/GHSA-93r5-fhx6-vmg9) | Recover from malformed input in linear time |
| [CVE-2026-83615](https://github.com/xmldom/xmldom/security/advisories/GHSA-965w-775f-mr7g) | Prevent quadratic namespace-map memory growth |
| [CVE-2026-83616](https://github.com/xmldom/xmldom/security/advisories/GHSA-c7q8-3ch8-vqpv) | Validate processing-instruction targets |
| [CVE-2026-83617](https://github.com/xmldom/xmldom/security/advisories/GHSA-jxjr-3g7g-3944) | Reject line terminators in serialized element/attribute names |
| [CVE-2026-83618](https://github.com/xmldom/xmldom/security/advisories/GHSA-vr34-hp96-76pp) | Validate complete document-type identifiers |

Affected-version ranges vary; in particular, CVE-2026-83617 applies to 0.9.11.
The pin avoids the affected ranges without claiming every listed issue existed
in the originally resolved 0.9.10 version.

## Browser runtime

`puppeteer-core` is aligned with Puppeteer 25.11.0 for the Marp/Mermaid browser
toolchain. Exercise HTML, Mermaid, and PDF export when changing these pins.
Tests run on macOS arm64 with Node 22.18.0 and 26.9.0; this is not a claim that
every intermediate Node release or operating system has been tested.

## Fonts for Taiwanese Mandarin in traditional characters

`@fontsource-variable/noto-sans-tc` is pinned to 5.3.0 (verified from the npm
registry on 2026-09-25). [Fontsource's installation guide](https://fontsource.org/fonts/noto-sans-tc/install)
documents the variable weight CSS used by the build. Font files and the upstream
licence are copied from the installed dependency into generated output, never
checked into repository source. Mermaid preloads label fonts before measuring
text and embeds the necessary subsets in its generated SVGs for offline use.
