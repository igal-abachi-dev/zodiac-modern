"""Read PE mitigation metadata only; development utility requiring pefile."""
import hashlib
import json
from pathlib import Path
import sys

import pefile


def inspect(path: Path) -> dict:
    data = path.read_bytes()
    image = pefile.PE(data=data)
    flags = image.OPTIONAL_HEADER.DllCharacteristics
    config = getattr(getattr(image, 'DIRECTORY_ENTRY_LOAD_CONFIG', None), 'struct', None)
    extended = []
    for entry in getattr(image, 'DIRECTORY_ENTRY_DEBUG', []):
        if entry.struct.Type == 20:
            start = entry.struct.PointerToRawData
            extended.append(int.from_bytes(data[start:start + entry.struct.SizeOfData], 'little'))
    return {
        'file': str(path), 'sha256': hashlib.sha256(data).hexdigest(),
        'dll_characteristics': hex(flags), 'high_entropy_va': bool(flags & 0x20),
        'dynamic_base': bool(flags & 0x40), 'nx_compat': bool(flags & 0x100),
        'guard_cf': bool(flags & 0x4000),
        'guard_flags': hex(getattr(config, 'GuardFlags', 0)),
        'guard_cf_function_count': getattr(config, 'GuardCFFunctionCount', 0),
        'cet_compat': any(value & 1 for value in extended),
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('inspect_pe.py <executable> [executable...]')
    print(json.dumps([inspect(Path(value)) for value in sys.argv[1:]], indent=2))
