import { randomBytes, randomInt } from 'node:crypto';

export async function getRandomKey(): Promise<string> {
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    randomBytes(10, (err, buf) => {
      if (err) {
        return reject(err);
      }
      resolve(buf);
    });
  });

  return bytes.toString('base64').slice(0, 10);
}

export async function getRandomLimit(): Promise<number> {
  return await new Promise((resolve, reject) => {
    randomInt(10, 1001, (err, n) => {
      if (err) {
        return reject(err);
      }
      resolve(n);
    });
  });
}
