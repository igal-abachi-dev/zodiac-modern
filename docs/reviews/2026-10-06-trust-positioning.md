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

## Ciphertext delivery, metadata and network privacy (2026-10-08)

This guidance addresses delivery of an already-created Zodiac ciphertext. The public-key encryption protects the message contents from a transport provider that does not have the recipient's private key; choosing email, a drive or a file-transfer service does not add sender authentication, anonymity, or protection for endpoint copies. Transport choice changes who can observe account/connection metadata, when and how often a file is accessed, approximate file size, and who can obtain a copy. A ciphertext's size can still reveal an approximate message-size range. Use a neutral filename and subject, and avoid adding plaintext or unnecessary identifying detail to accompanying messages.

### Routes and their tradeoffs

- **Direct ciphertext attachment or raw text** is the simplest fallback. Email providers and recipients may still retain the message, its sender/recipient, timing, subject and attachment size. This is a metadata tradeoff, not a break of Zodiac's encryption. Email-client copy/paste support remains subject to the existing Gmail-primary/Outlook-secondary compatibility checks.
- **Proton Drive** can provide an expiring, password-protected, revocable share link, but does not make sharing anonymous. Proton documents access to link creation/access times, access counts and the account that created it; the file's encrypted name and content are not visible to Proton under its stated model. A downloaded copy cannot be revoked. Use viewer access, a short expiry, and a strong link password sent over a separate channel when link exposure is in scope. [Proton Drive share-link guidance](https://proton.me/support/drive-shareable-link) and [privacy policy](https://proton.me/drive/privacy-policy).
- **Wormhole** is a convenient expiring transfer route with browser-side encryption. Its share URL includes the file-transfer key in the fragment. Treat the complete URL as a bearer secret: anyone who obtains it can access/decrypt Wormhole's transferred file. When that file is Zodiac ciphertext, they still need the Zodiac recipient private key to recover the message. This adds a service, delivered-web-code trust and availability dependency; it does not authenticate the sender. [Wormhole security design](https://wormhole.app/security).
- **OnionShare** is an option when avoiding a cloud-hosted file copy and reducing direct IP exposure are priorities. The sender hosts locally through Tor; both sides need Tor access, and the sender's device must remain available until retrieval. The onion URL and access key still need a secure sharing channel. Do not treat Tor as guaranteed anonymity against all observers. [OnionShare documentation](https://docs.onionshare.org/2.6.3/en/features.html).
- **qBittorrent/private torrents** are not recommended for one-to-one confidential delivery. A private-torrent flag does not itself make a transfer anonymous or hide participants from the tracker/peers; the extra swarm and availability model offers little value for a small message.

Practical default: send raw ciphertext directly for simplicity. If access revocation/expiry before download matters, use a viewer-only Proton Drive link with short expiry and a separately delivered strong link password. If avoiding a cloud file host and reducing ordinary IP exposure matters more than convenience, consider OnionShare. Wormhole is a convenience option when its link-as-secret and hosted-code tradeoffs are acceptable. In every case, stop-sharing/revocation cannot erase copies already downloaded.

### Password channel and VPN

If a transport password is used, send it through a separate end-to-end encrypted one-to-one channel. Signal is a reasonable default for this: it supports safety-number comparison for the chat's cryptographic keys, but that check alone does not prove real-world identity. WhatsApp personal chats are also end-to-end encrypted and can be used if that is the recipient's established channel; the choice does not change Zodiac ciphertext confidentiality. Threema and Session are alternatives with different account and routing models; Session documents onion-routed requests, with corresponding delivery/performance tradeoffs. No messenger can prevent recipients from saving/copying the password or their local message history. [Signal safety numbers](https://support.signal.org/hc/en-us/articles/360007060632-What-is-a-safety-number-and-why-do-I-see-that-it-changed), [Session routing](https://docs.getsession.org/session-network/session-protocol/onion-requests-and-message-routing).

A VPN is optional and does not strengthen Zodiac's encryption or hide the user's account/activity from a logged-in destination service. It can shift destination visibility from the local ISP/network to the VPN provider and make destination sites see the VPN exit IP; this is a network-privacy tradeoff, not anonymity. WireGuard is a tunneling protocol and does not determine a provider's logging policy. Use a VPN when the ISP/local-network observation threat warrants that trust shift; it is not required merely to send ciphertext. [Mullvad VPN threat explanation](https://mullvad.net/en/vpn/what-is-vpn), [Proton VPN threat model](https://protonvpn.com/blog/threat-model).

This is operational guidance, not a new transport integration requirement or claim that any provider's current implementation has been independently reviewed by Zodiac. Existing product scope remains raw ciphertext export with no automatic sending, email API, remote upload, or network service. The existing E06/QA-02 email compatibility and metadata/privacy checks remain the applicable validation tasks; no new backlog task is inferred solely from this recommendation.

### Practical delivery ranking: no receiver app install (2026-10-08)

The user wants recipients to retrieve files without installing Tor or qBittorrent. For a Zodiac ciphertext, the practical ranking is:

1. **Proton Drive share link (default when expiry/revocation before download is useful):** use viewer-only access, short expiry and, when appropriate, a strong link password delivered separately. Browser download avoids a dedicated transfer-app install. Account identity and share-link activity metadata remain visible to Proton under its documented model; revocation cannot erase downloaded copies.
2. **Proton Mail attachment:** convenient when both parties already use Proton Mail.
3. **Gmail attachment:** convenient fallback, with ordinary email metadata (sender/recipient, time, subject and size) visible to the provider.
4. **Wormhole expiring browser link:** convenient for recipients without a transfer app; treat the complete link as a bearer secret because the file-transfer key is included in it. If the transferred file is Zodiac ciphertext, the Zodiac recipient private key is still required to recover the message.

Default recommendation: use a Proton Drive viewer link with a short expiry when link controls matter; otherwise attach raw ciphertext to Proton Mail or Gmail for simplicity. Use a neutral filename and subject, and send any separate transfer password through a different end-to-end encrypted channel. A VPN is optional: it changes which network provider can observe connection destinations but does not strengthen Zodiac encryption or conceal an account from a signed-in service. OnionShare and qBittorrent are excluded from this recipient-friendly ranking because they do not satisfy the no-special-app-install preference.

This is practical UX guidance, not an endorsement or independent review of these providers, and does not add transport integrations to Zodiac. The sender continues to export ciphertext locally; the user chooses and operates the delivery service.
