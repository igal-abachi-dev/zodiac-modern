import { encryptMessage } from '../../src/lib/crypto/hybrid';
import { importPublicKey } from '../../src/lib/crypto/public-key';
import {
  decodeBase64URL,
  encodeBase64URL,
} from '../../src/lib/codecs/base64url';
declare global {
  interface Window {
    zodiacTest: {
      encryptMessage: typeof encryptMessage;
      importPublicKey: typeof importPublicKey;
      decodeBase64URL: typeof decodeBase64URL;
      encodeBase64URL: typeof encodeBase64URL;
    };
  }
}
window.zodiacTest = {
  encryptMessage,
  importPublicKey,
  decodeBase64URL,
  encodeBase64URL,
};
