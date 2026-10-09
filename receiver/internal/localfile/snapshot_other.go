//go:build !windows

package localfile

func snapshotAdvisory() string {
	return "Snapshot check: this receiver build cannot inspect Windows shadow-copy device names; this check does not establish that snapshots or other copies are absent."
}
