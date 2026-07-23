import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "crypto";

/**
 * Envelope encryption for audit credentials.
 * - A fresh 256-bit DEK encrypts the plaintext (AES-256-GCM).
 * - The DEK is itself encrypted with the KMS master key (CREDENTIAL_MASTER_KEY).
 * The plaintext DEK never touches disk; only ciphertext + wrapped DEK are stored.
 */

function masterKey(): Buffer {
  const b64 = process.env.CREDENTIAL_MASTER_KEY;
  if (!b64) throw new Error("CREDENTIAL_MASTER_KEY not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("CREDENTIAL_MASTER_KEY must be 32 bytes (base64)");
  return key;
}

export interface SealedCredential {
  ciphertext: string; // base64
  encDek: string; // base64 (wrapped DEK + its iv + tag)
  iv: string; // base64 (data iv)
  authTag: string; // base64 (data tag)
}

export function sealCredential(plaintext: string): SealedCredential {
  const dek = randomBytes(32);
  const dataIv = randomBytes(12);
  const dataCipher = createCipheriv("aes-256-gcm", dek, dataIv);
  const ct = Buffer.concat([dataCipher.update(plaintext, "utf8"), dataCipher.final()]);
  const dataTag = dataCipher.getAuthTag();

  const dekIv = randomBytes(12);
  const dekCipher = createCipheriv("aes-256-gcm", masterKey(), dekIv);
  const encDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekTag = dekCipher.getAuthTag();

  return {
    ciphertext: ct.toString("base64"),
    encDek: Buffer.concat([dekIv, dekTag, encDek]).toString("base64"),
    iv: dataIv.toString("base64"),
    authTag: dataTag.toString("base64"),
  };
}

export function openCredential(sealed: SealedCredential): string {
  const wrapped = Buffer.from(sealed.encDek, "base64");
  const dekIv = wrapped.subarray(0, 12);
  const dekTag = wrapped.subarray(12, 28);
  const encDek = wrapped.subarray(28);
  const dekDecipher = createDecipheriv("aes-256-gcm", masterKey(), dekIv);
  dekDecipher.setAuthTag(dekTag);
  const dek = Buffer.concat([dekDecipher.update(encDek), dekDecipher.final()]);

  const dataDecipher = createDecipheriv(
    "aes-256-gcm",
    dek,
    Buffer.from(sealed.iv, "base64")
  );
  dataDecipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  const pt = Buffer.concat([
    dataDecipher.update(Buffer.from(sealed.ciphertext, "base64")),
    dataDecipher.final(),
  ]);
  return pt.toString("utf8");
}
