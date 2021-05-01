#!/usr/bin/env python3

import subprocess
import shutil
import tempfile
import glob
import os
import sys
import argparse

def main():
    p = argparse.ArgumentParser()
    p.add_argument('DATFILE', help='path to datfile, e.g. th10.dat')
    p.add_argument('--game', '-g', required=True, help='game number, as accepted by thtk')
    p.add_argument('--output', '-o', required=True, help='output zip file')
    args = p.parse_args()

    with tempfile.TemporaryDirectory() as dat_tmpdir:
        with tempfile.TemporaryDirectory() as zip_tmpdir:
            run_with_tempdirs(datpath=args.DATFILE, game=args.game, outpath=args.output, dat_tmpdir=dat_tmpdir, zip_tmpdir=zip_tmpdir)

def run_with_tempdirs(datpath, game, outpath, dat_tmpdir, zip_tmpdir):
    # resolve this now so we can set cwd for thdat (which always extracts to cwd)
    datpath = os.path.realpath(datpath)
    # extract to tmpdir
    run_process(['thdat', '-x', game, datpath], cwd=dat_tmpdir, check=True, stdout=subprocess.PIPE)

    for anm_path in glob.glob(os.path.join(dat_tmpdir, '*.anm')):
        basename = os.path.splitext(os.path.basename(anm_path))[0]
        zip_subdir = os.path.join(zip_tmpdir, basename)
        os.mkdir(zip_subdir)
        if game == '143' and basename == 'bestshot':
            continue # unfortunately thanm cannot extract this one

        print(f'=== {basename} ===')
        run_process(['thanm', '-x', anm_path], cwd=zip_subdir, check=True)
        spec_bytes = run_process(['thanm', '-l', anm_path], stdout=subprocess.PIPE, check=True).stdout

        with open(os.path.join(zip_subdir, 'spec.spec'), 'wb') as f:
            f.write(spec_bytes)

    with open(os.path.join(zip_tmpdir, 'game.txt'), 'w') as f:
        f.write(f'{game}\n')

    make_archive(zip_tmpdir, outpath)

def make_archive(source, destination):
    # Create a zip file from a directory, without giving the entries in the zipfile a common prefix.
    # (i.e. unzipping the file may produce multiple things in the current directory)
    base_name, format = destination.rsplit('.', 1)
    root_dir = os.path.dirname(source)
    base_dir = os.path.basename(source.strip(os.sep))
    shutil.make_archive(base_name, format, os.path.join(root_dir, base_dir), '.')

def run_process(proc_args, *args, **kw):
    try:
        return subprocess.run(proc_args, *args, **kw)
    except FileNotFoundError:
        print(f'Cannot find {proc_args[0]}!', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
