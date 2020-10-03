#!/usr/bin/env python3

import os
import re
b = open(r'E:\Downloaded Software\Touhou Project\TH12.5 ~ Double Spoiler\th125.exe', 'rb').read()

total = b.count(b'\x84\x04\x00\x00')
for i, match in enumerate(re.finditer(b'\x84\x04\x00\x00', b)):
    s = match.start()
    if b[s-2:s] != b'\x09\xb8' and b[s-2] != 83:
        print(f'{i:03} of {total}: {s + 0x400000:#10x}  {b[s-2]:02x}{b[s-1]:02x}')
    else:
        print('qqqqqqqqqqqqqqqqqqq')
print()
