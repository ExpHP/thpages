import unbzip2Stream from 'unbzip2-stream';
import concat from 'concat-stream';

export function decompressBz2(input: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const unbz2 = unbzip2Stream();
    unbz2.on('error', (err) => reject(err));
    unbz2.pipe(concat((b) => {
      resolve(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
    }));
    unbz2.end(input);
  });
}
