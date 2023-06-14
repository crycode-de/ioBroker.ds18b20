/*
 * Common functions and constants used by the adapter and the remote client.
 */

import * as crypto from 'crypto';

/**
 * Protocol version for the communication.
 * May change in future versions.
 */
export const REMOTE_PROTOCOL_VERSION = 3;

/**
 * Length of the initialization vector for encryption.
 * For AES, this is always 16.
 */
const IV_LENGTH = 16;

/**
 * Encrypt a string with the given key.
 * @param text The string to encrypt.
 * @param key The key to use.
 * @throws An error if the key has not 32 bytes.
 */
export function encrypt (text: crypto.BinaryLike, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([ encrypted, cipher.final() ]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt an encrypted string with the given key.
 * @param text The encrypted string to decrypt.
 * @param key The key to use.
 * @throws An error if the key has not 32 bytes isn't valid.
 */
export function decrypt (text: string, key: Buffer): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() as string, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([ decrypted, decipher.final() ]);

  return decrypted.toString();
}
