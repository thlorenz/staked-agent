declare module "bs58" {
  const bs58: {
    encode(input: Uint8Array): string;
  };
  export default bs58;
}

declare module "tweetnacl" {
  const nacl: {
    sign: {
      detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    };
  };
  export default nacl;
}
