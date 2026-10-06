# Relayed comparative trust and positioning feedback

The user supplied this comparative assessment on 2026-10-06. Reviewer identity,
reviewed revision, cited evidence and the referent of the closing phrase
“hat.s” were not supplied. Treat the rankings and product comparisons below as
that reviewer's opinion, not verified market research, endorsement or QA-03
security assessment.

## Reviewer's current recommendations

| Use case                       | Reviewer preference                            | Stated reason and limitation                                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One-off or file-style secrets  | age; GnuPG where the recipient already uses it | Offline public-key encryption has a longer public scrutiny and deployment history. age is presented as a simpler modern CLI/library; GnuPG offers mature key management and signing but has more configuration and legacy complexity. Both still require a trusted public-key exchange. |
| Ongoing conversational secrets | Signal                                         | An established end-to-end messaging protocol and product, but it is account-based and interactive rather than a static encrypt-once/share-a-file workflow.                                                                                                                              |
| Similar hosted browser tools   | PrivateBin/Yopass are honorable mentions       | Client-side encryption still depends on trusting the JavaScript delivered by the host, a trust boundary Zodiac also has when used as a hosted site.                                                                                                                                     |

The reviewer places Zodiac below these mature tools for protecting real secrets
today, while recognizing its distinct local-first browser encryption, offline
Go receiver and glyph-artwork niche. Their stated gaps are an independent,
published system review; signed and verifiable artifacts with a trusted
publisher channel and official origin; production history; simpler modern
asymmetric cryptography; broader receiver-platform support; and completed
operational/usability trials. These are review observations and comparisons,
not new repository findings or independently verified claims.

## Product positioning and disposition

The user wants Zodiac to offer substantially better usability for its specific
“compose in browser, share raw ciphertext/artwork, decrypt offline” workflow,
and considers that it could become comparable for that use case after
independent review. Treat this as a product goal and conditional hypothesis.
An independent review could improve assurance about the reviewed revision and
scope; by itself it would not establish maturity equal to tools with years of
production history, signed release channels, wider platform support or larger
ecosystems. Better usability also needs evidence from the planned recipient and
email trials. Do not claim that Zodiac is safer than, equal to, or a replacement
for age, GnuPG or Signal today.

This feedback reinforces the existing priorities: complete QA-03 and publish
its findings; decide and verify the official origin, publisher, release hashes
and independent verification channel; and finish human operational and
compatibility trials. These remain separate gates in the backlog and status
record. No new security approval or release decision is inferred here.

## Additional hat.sh comparison

The user supplied a follow-up comparison on the same date. The reviewer judges
hat.sh to be the more mature shipped browser product, while judging Zodiac's
development process and available author-run evidence stronger in some areas.
They consider both unaudited and below age, GnuPG and Signal for high-value
secrets. Their listed limitations for both browser tools are no independent
published audit, no signed trusted release channel, no years-long adversarial
history and the delivered-JavaScript host trust gap. Zodiac's public-key
message/offline-receiver use case differs from hat.sh's file/password/key
encryption use case, so the primitive list is not a direct security ranking.

The reviewer reports hat.sh uses libsodium, XChaCha20-Poly1305, Argon2id and
X25519, and describes it as having roughly 2.3k GitHub stars. hat.sh's own
README lists those primitives and, when checked on 2026-10-06, GitHub displayed
2.3k stars. That supports the feature and star-count observations, but stars
measure attention, not security or maturity. The reviewer reports no hat.sh
audit and says the developer confirmed that; this workspace has not verified
that statement against a developer response or an audit registry. See the
[hat.sh README](https://github.com/sh-dv/hat.sh#security) and
[repository page](https://github.com/sh-dv/hat.sh).

The user also reports that Privacy Guides formerly recommended hat.sh and
later removed browser-based encryption recommendations. A historical Privacy
Guides translation snapshot includes a hat.sh recommendation under browser
encryption, while the current public [Privacy Guides tools page](https://www.privacyguides.org/en/tools/)
does not list an encryption-software recommendation category. This supports
that a past recommendation existed and that the current top-level list omits
that category. It does not establish when or why it was removed, or prove the
reported rationale that browser-encryption recommendations were removed as a
class. Relevant records: [historical translation snapshot](https://code.privacyguides.dev/privacyguides/i18n/blame/commit/d4ad37e6ea02f7fc12ed5c175f39fcfbaf9be2b6/i18n/cs/encryption.md)
and a [Privacy Guides discussion about a proposed removed-tools list](https://discuss.privacyguides.net/t/list-of-recently-added-and-removed-tools/25800).

The comparison does not change the product disposition above. hat.sh's
different password/file-encryption threat model and its published algorithm
choices do not settle which tool better fits public-key message delivery; nor
do Zodiac's author-run tests substitute for independent review. The comparative
claims remain feedback, not a head-to-head test or endorsement.
