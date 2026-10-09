//go:build windows

package localfile

import (
	"strings"
	"testing"
	"unicode/utf16"
)

func TestParseDOSDeviceNames(t *testing.T) {
	encoded := utf16.Encode([]rune("C:\x00HarddiskVolumeShadowCopy17\x00Volume{test}\x00\x00"))
	names := parseDOSDeviceNames(encoded)
	if len(names) != 3 || names[0] != "C:" || names[1] != "HarddiskVolumeShadowCopy17" || names[2] != "Volume{test}" {
		t.Fatalf("unexpected device list: %#v", names)
	}
	if count := countShadowCopyDeviceNames(names); count != 1 {
		t.Fatalf("count = %d, want 1", count)
	}
}

func TestSnapshotAdvisoryNeverClaimsAbsence(t *testing.T) {
	message := SnapshotAdvisory()
	t.Log(message)
	if !strings.Contains(message, "Snapshot check:") || !strings.Contains(message, "does not establish") {
		t.Fatalf("advisory overstates what the probe proves: %q", message)
	}
}
