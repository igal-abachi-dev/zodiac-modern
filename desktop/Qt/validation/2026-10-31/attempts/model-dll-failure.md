# Retained failure summary

The first run of the newly added `qt-model-contract` test exited with Windows
status **0xc0000135** because Qt DLLs were not on the test process PATH. The pure
domain test passed. Windows displayed a missing-Qt-DLL error dialog. This is a
summary of the observed run; the later successful log replaced the original
rolling `.cache/build-final.log`, so this is not represented as its raw transcript.

Build.ps1 now prepends the chosen Qt kit's bin directory to its process-local
PATH before CTest. Both tests passed afterward. The published application folder
already contained the required Qt DLLs; no global PATH change was made.
