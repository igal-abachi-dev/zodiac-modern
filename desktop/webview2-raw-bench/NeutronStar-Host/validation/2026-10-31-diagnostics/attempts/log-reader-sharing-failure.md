# Retained collector failure

An intermediate `Test-Failures.ps1` attempt failed before injecting its renderer
fault: `File.ReadAllText` could not open the report while the C++ writer was
using it. The tool reported an IOException / file in use. The adjacent JSONL is
the raw report from that attempt, not an accepted process-failure test.

The reader now opens with FileShare.ReadWrite/Delete, parses only newline-committed
records while the writer is live, and rejects incomplete final records/corrupt
committed JSON. Direct live-writer tests cover all four behaviors for both readers.
The GUI/failure suites were rerun. This was a test-reader defect, not evidence of
a renderer crash, successful recovery, or an application lifecycle regression.
