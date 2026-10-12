const IV_LENGTH = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function assertBrowserCrypto(): SubtleCrypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("当前环境不支持 Web Crypto。");
  }
  return window.crypto.subtle;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

async function getCipherKey(): Promise<CryptoKey> {
  const subtle = assertBrowserCrypto();
  const origin = typeof window !== "undefined" ? window.location.origin : "local";
  const seed = encoder.encode(`alchemy-workshop-local-v1::${origin}`);
  const digest = await subtle.digest("SHA-256", seed);
  return subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptForLocalStorage(rawText: string): Promise<string> {
  if (!rawText) {
    return "";
  }

  const subtle = assertBrowserCrypto();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await getCipherKey();
  const encrypted = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    encoder.encode(rawText),
  );

  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptFromLocalStorage(cipherText: string): Promise<string> {
  if (!cipherText) {
    return "";
  }

  const subtle = assertBrowserCrypto();
  const [ivPart, dataPart] = cipherText.split(".");
  if (!ivPart || !dataPart) {
    throw new Error("本地密文格式错误。");
  }

  const iv = fromBase64(ivPart);
  const encrypted = fromBase64(dataPart);
  const key = await getCipherKey();
  const decrypted = await subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(encrypted),
  );

  return decoder.decode(decrypted);
}
