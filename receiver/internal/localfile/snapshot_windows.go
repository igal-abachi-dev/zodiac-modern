//go:build windows

package localfile

import (
	"fmt"
	"strings"

	"golang.org/x/sys/windows"
)

const maxDOSDeviceNames = 32 * 1024

func snapshotAdvisory() string {
	buffer := make([]uint16, maxDOSDeviceNames)
	n, err := windows.QueryDosDevice(nil, &buffer[0], uint32(len(buffer)))
	if err != nil || n == 0 || n > uint32(len(buffer)) {
		return "Snapshot check: Windows shadow-copy device status is unavailable; this check does not establish that snapshots or other copies are absent."
	}

	count := countShadowCopyDeviceNames(parseDOSDeviceNames(buffer[:n]))
	if count > 0 {
		return fmt.Sprintf("Snapshot check: detected %d shadow-copy device name(s) exposed to this process. This system-wide check does not establish which files they contain or that snapshots are absent; best-effort cleanup cannot remove snapshot or backup copies.", count)
	}
	return "Snapshot check: no shadow-copy device names were exposed to this process. This check does not establish that VSS snapshots or other copies are absent; cleanup remains best effort."
}

func parseDOSDeviceNames(buffer []uint16) []string {
	names := make([]string, 0, 32)
	for offset := 0; offset < len(buffer); {
		end := offset
		for end < len(buffer) && buffer[end] != 0 {
			end++
		}
		if end == offset || end == len(buffer) {
			break
		}
		names = append(names, windows.UTF16ToString(buffer[offset:end]))
		offset = end + 1
	}
	return names
}

func countShadowCopyDeviceNames(names []string) int {
	count := 0
	for _, name := range names {
		if strings.HasPrefix(strings.ToLower(name), "harddiskvolumeshadowcopy") {
			count++
		}
	}
	return count
}
