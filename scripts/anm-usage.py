#!/usr/bin/env python3

from collections import Counter, UserString, defaultdict
import os, sys, re, json, glob
import argparse
import typing as tp
import subprocess
import functools
import pandas as pd
from pathlib import Path

ins_by_file = {}
vars_by_file = {}
num_files = {}

# Input directory structure should be created by scripts/make-stats-inputs:
#
# 06/
#   anm/*.anm
#   msg/*
#   ecl/*.ecl
#   std/*.std
#   end/*
# 07/
#   etc.
#
# truth must be installed.

ALL_FORMATS = ['anm', 'msg', 'end', 'std']
def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dir', type=str, help='root directory. defaults to cwd')
    p.add_argument('format', nargs='*', choices=ALL_FORMATS)
    p.add_argument('--compressed', action='store_true')
    args = p.parse_args()

    formats = args.format or ALL_FORMATS
    dir = args.dir or os.getcwd()
    run(dir, formats=formats, compressed=args.compressed)

def iter_files(data_root, formats):
    for game_dir in Path(data_root).iterdir():
        if not game_dir.is_dir():
            continue
        game = game_dir.name
        for format in formats:
            format_dir = game_dir / format
            if format_dir.exists():
                for child in format_dir.iterdir():
                    yield Location(game=game, format=format, filename=child.name, path=child)

def run(root, formats, compressed):
    stats_by_fmt = {fmt: gather_fmt_stats(root, fmt) for fmt in formats}
    print(json.dumps(stats_by_fmt))

def old_print_data(stats_by_fmt):

    # we manually do some of the json printing to get newlines in a small number of key places,
    # while still keeping the total size of the file down to around half a megabyte
    def stringify_fmt_data(d):
        from io import StringIO
        sio = StringIO()
        p = lambda *args, **kw: print(*args, **kw, file=sio)
        p('{')
        p(f'"num-files": {json.dumps(d["num-files"])},')
        p('"ins": {')
        p(',\n'.join(f'"{k}": {json.dumps(v)}' for (k, v) in d['ins'].items()))
        p('},')
        p('"var": {')
        p(',\n'.join(f'"{k}": {json.dumps(v)}' for (k, v) in d['var'].items()))
        p('}')
        p('}')
        return sio.getvalue()

    print('{')
    print(',\n'.join(f'"{k}": {stringify_fmt_data(v)}' for (k,v) in stats_by_fmt.items()))
    print('}')

# {'anm':
#    'num-files': {'06': 80},
#    'ins': {'06': {'22': {'total': 100, 'breakdown': [["blah.msg", 100]]}}} }

def gather_stuff(inputdir: Path, formats):
    file_counts = defaultdict(Counter)

    uselocs: tp.List[UsageLocation] = []
    for location in iter_files(inputdir, formats=formats):
        print(location)
        file_counts[location.format][location.game] += 1
        for usage in iter_all_items(filepath=location.path, format=location.format, game=location.game):
            uselocs.append(UsageLocation(usage=usage, location=location))

    df = pd.DataFrame(dict(
        filename=[useloc.location.filename for useloc in uselocs],
        game=[useloc.location.filename for useloc in uselocs],
        format=[useloc.location.format for useloc in uselocs],
        kind=[useloc.usage.kind for useloc in uselocs],
        number=[useloc.usage.number for useloc in uselocs],
    ))
    return df

INS_RE = re.compile('ins_(?P<InsOrReg_ins_opcode>[0-9]+)')
VAR_RE = re.compile('REG\\[(?P<InsOrReg_reg_number>-?10[0-9]+)')

def gather_fmt_stats(root, fmt):
    ins_by_file = {}
    vars_by_file = {}
    num_files = {}

    for game_specdir in sorted(glob.glob(f'{root}/*/{fmt}')):
        game = Path(game_specdir).parent.name

        ins_by_file[game] = {}
        vars_by_file[game] = {}
        num_files[game] = 0
        for filename in os.listdir(f'{root}/{game}/{fmt}'):
            num_files[game] += 1

            text = decompile(f'{root}/{game}/{fmt}/{filename}', fmt, game, with_blocks=False)
            ins_by_file[game][filename] = Counter(match.group(1) for match in INS_RE.finditer(text))
            vars_by_file[game][filename] = Counter(match.group(1) for match in VAR_RE.finditer(text))

    def flip_stats(by_file):
        by_num = {}
        for game in by_file:
            by_num[game] = defaultdict(list)
            for anm in by_file[game]:
                for opcode, count in by_file[game][anm].items():
                    by_num[game][opcode].append((anm, count))
        for game in by_num:
            for opcode in by_num[game]:
                by_num[game][opcode] = {
                    'total': sum(t[1] for t in by_num[game][opcode]),
                    'breakdown': sorted(by_num[game][opcode], key=lambda t:-t[1]),
                }
        return by_num

    return {
        'num-files': num_files,
        'ins': flip_stats(ins_by_file),
        'var': flip_stats(vars_by_file),
    }

def decompile(path, format, game, with_blocks):
    env = dict(os.environ)
    env['TRUTH_MAP_PATH'] = ''  # rename nothing

    cmd, has_signatures = {
        'anm': (['truanm', 'decomp', '--game', game], True),
        'msg': (['trumsg', 'decomp', '--game', game], True),
        'std': (['trustd', 'decomp', '--game', game], True),
        'end': (['trumsg', 'decomp', '--game', game], False),  # end is not fully implemented
    }[format]
    if not has_signatures:
        decomp_flags = ['--no-arguments']
    elif with_blocks:
        decomp_flags = []
    else:
        decomp_flags = ['--no-intrinsics']  # so we can even count intrinsics

    result = subprocess.run(cmd + decomp_flags + [path], env=env, stdout=subprocess.PIPE)
    result.check_returncode()
    return result.stdout.decode('utf-8')

def iter_all_items(format, game, filepath):
    """ Iterate over all usages of instructions and registers in a file. """
    source = decompile(filepath, format, game, with_blocks=False)
    yield from _iter_all_items(source)

# def iter_items_in_loops(format, game, filepath):
#     """ Iterate over all usages of instructions and registers in loops in a file. """
#     source_with_loops = decompile(filepath, format, game, with_blocks=True)
#     yield from _iter_items_in_loops(source_with_loops)

def _iter_all_items(source):
    for match in Usage.RE.finditer(source):
        yield Usage.from_re_match(match)

# def _iter_items_in_loops(source_with_loops):
#     @functools.lru_cache(None)
#     def get_re():
#         loop_kw = r'\b(times|loop|while|until)\b'
#         loop_maybe_paren = r'(\([^)]\))?'
#         loop_open = rf'{loop_kw}\s*{loop_maybe_paren}\s*\{{'
#         other_open = '\{'
#         close = '\}'
#         return re.compile(rf'(?P<loop_open>{loop_open})|(?P<other_open>{other_open})|(?P<close>{close})|{Usage.RE_STRING}')

#     stack = []
#     for match in get_re().finditer(source_with_loops):
#         if match.group('loop_open'):
#             stack.append('loop')
#         elif match.group('other_open'):
#             stack.append('other')
#         elif match.group('close'):
#             stack.pop()
#         else:
#             # Only count if we are in a loop
#             if 'loop' in stack:
#                 yield Usage.from_re_match(match)

class UsageLocation(tp.NamedTuple):
    """ A usage of any instruction or register in a single file. """
    usage: 'Usage'
    location: 'Location'

class Location(tp.NamedTuple):
    """ A file in a single game. """
    format: str
    game: str
    filename: str
    path: Path

class UsageBase(tp.NamedTuple):
    kind: str  # switch to tp.Literal['ins', 'reg'] when more widely available
    number: int

class Usage(UsageBase):
    INS_RE_STRING = 'ins_(?P<InsOrReg_ins_opcode>[0-9]+)'
    VAR_RE_STRING = 'REG\\[(?P<InsOrReg_reg_number>-?10[0-9]+)'
    RE_STRING = f'{INS_RE_STRING}|{VAR_RE_STRING}'
    RE = re.compile(RE_STRING)

    @classmethod
    def from_re_match(cls, match):
        if match.group('InsOrReg_ins_opcode'):
            kind = 'ins'
            number = int(match.group('InsOrReg_ins_opcode'))
        elif match.group('InsOrReg_reg_number'):
            kind = 'reg'
            number = int(match.group('InsOrReg_reg_number'))
        else:
            raise ValueError(f'invalid match: {repr(match)}')
        return cls(kind=kind, number=number)

# ==============================================================================

# class BreakdownItem(tp.NamedTuple):
#     filename: 'InternedString'
#     counts: 'FilteredCounts'

# class FilteredCountsBase(tp.NamedTuple):
    # total: int
    # loop: int

# class FilteredCounts(FilteredCountsBase):
#     def __add__(self, other):
#         assert isinstance(other, FilteredCounts)
#         return FilteredCounts(*(a + b for (a, b) in zip(self, other)))
# FilteredCounts.ZERO = FilteredCounts(0, 0)

# def to_cereal(x, compressed):
#     if hasattr(x, 'to_cereal'):
#         return getattr(x, 'to_cereal')(compressed)
#     elif x is None or isinstance(x, (float, int, str, bool)):
#         return x  # native json
#     elif isinstance(x, (list, tuple)):
#         return [to_cereal(item, compressed) for item in x]
#     elif isinstance(x, dict):
#         return [to_cereal(item, compressed) for item in x]
#     else:
#         raise TypeError(f"can't serialize {type(x)}")

# class Interner:
#     """ Assigns integers to strings to enable a more compressed encoding of JSON. """
#     def __init__(self):
#         from collections import OrderedDict
#         self._ids = OrderedDict()

#     def intern(self, s):
#         assert isinstance(s, str)
#         if s not in self._ids:
#             self._ids[s] = len(self._ids)
#         return InternedString(s, self._ids[s])

#     def values(self):
#         return list(self._ids)

# class InternedString(UserString):
#     def __init__(self, s, id):
#         super().__init__(s)
#         self.id = id

#     def to_cereal(self, compressed):
#         if compressed:
#             return self.id
#         else:
#             return self.data

# class NamedTupleCollection:
#     """ A list of namedtuples with a compressible JSON representation. """
#     def __init__(self, ty, tuples):
#         tuples = list(tuples)
#         assert all(isinstance(tup, ty) for tup in tuples)
#         self.ty = ty
#         self.tuples = tuples

#     def to_cereal(self, compressed):
#         if compressed:
#             return {'@struct-collection': {
#                 'fields': self.ty._fields,
#                 'items': [tuple(tup) for tup in self.tuples],
#             }}
#         else:
#             return [tup._asdict() for tup in self.tuples]

main()
