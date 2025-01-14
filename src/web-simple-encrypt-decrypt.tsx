import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone,
  Server,
  ArrowRight,
  Lock,
  Unlock,
  Key,
  Send,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

const WebCryptoDemo = () => {
  const [encryptKeyPair, setEncryptKeyPair] = useState(null);
  const [signKeyPair, setSignKeyPair] = useState(null);
  const [message, setMessage] = useState("Hello, this is a signed message!");
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isReceived, setIsReceived] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showEducation, setShowEducation] = useState(false);
  const [tamperMode, setTamperMode] = useState(false);
  const [signatureVisible, setSignatureVisible] = useState(false);

  useEffect(() => {
    generateKeys();
  }, []);

  const generateKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate encryption keys (RSA)
      const newEncryptKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );
      setEncryptKeyPair(newEncryptKeyPair);

      // Generate signing keys (ECDSA)
      const newSignKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-384",
        },
        true,
        ["sign", "verify"]
      );
      setSignKeyPair(newSignKeyPair);
    } catch (err) {
      setError("Failed to generate keys: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const signAndEncryptMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      setSignatureVisible(true);

      // Sign the message
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const signature = await window.crypto.subtle.sign(
        {
          name: "ECDSA",
          hash: { name: "SHA-384" },
        },
        signKeyPair.privateKey,
        messageBytes
      );

      // Prepare and encrypt the data package with AES
      const dataPackage = {
        message: message,
        signature: Array.from(new Uint8Array(signature)),
      };

      // Generate a random AES key
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Create IV for AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the package with AES
      const encryptedPackage = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        aesKey,
        encoder.encode(JSON.stringify(dataPackage))
      );

      // Export the AES key
      const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

      // Encrypt the AES key with RSA
      const encryptedAesKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        encryptKeyPair.publicKey,
        rawAesKey
      );

      // Combine everything into a single package
      const finalPackage = {
        encryptedKey: Array.from(new Uint8Array(encryptedAesKey)),
        iv: Array.from(iv),
        encryptedData: Array.from(new Uint8Array(encryptedPackage)),
      };

      const base64 = btoa(JSON.stringify(finalPackage));
      setEncryptedData(base64);
    } catch (err) {
      setError("Encryption failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const decryptAndVerifyMessage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse the encrypted package
      const encryptedPackage = JSON.parse(atob(encryptedData));

      // Decrypt the AES key first
      const decryptedAesKey = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        encryptKeyPair.privateKey,
        new Uint8Array(encryptedPackage.encryptedKey)
      );

      // Import the AES key
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        decryptedAesKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Decrypt the data package
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(encryptedPackage.iv),
        },
        aesKey,
        new Uint8Array(encryptedPackage.encryptedData)
      );

      // Parse the decrypted data package
      const decoder = new TextDecoder();
      const dataPackage = JSON.parse(decoder.decode(decrypted));

      if (tamperMode) {
        // Simulate message tampering
        dataPackage.message += " 👹";
      }

      // Verify the signature
      const messageBytes = new TextEncoder().encode(dataPackage.message);
      const isValid = await window.crypto.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-384" },
        },
        signKeyPair.publicKey,
        new Uint8Array(dataPackage.signature),
        messageBytes
      );

      setDecryptedMessage(dataPackage.message);
      setVerificationStatus(isValid ? "verified" : "invalid");
    } catch (err) {
      setError("Decryption/verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    setIsReceived(false);
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsReceived(true);
    }, 1000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            End-to-End Encryption with Digital Signatures
          </CardTitle>
          <CardDescription>
            Secure message exchange with signature verification and tampering
            detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Educational Panel */}
          <div className="mb-6">
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Info className="w-4 h-4" />
              {showEducation ? "Hide" : "Show"} How It Works
            </button>

            {showEducation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-4 text-sm">
                <div>
                  <h3 className="font-medium mb-2">Order of Operations:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Key Generation: RSA-2048 for encryption/decryption and
                      ECDSA P-384 for signatures
                    </li>
                    <li>
                      First, the message is signed before encryption
                      (sign-then-encrypt)
                    </li>
                    <li>
                      A random 256-bit AES key and 96-bit IV are generated for
                      each message
                    </li>
                    <li>
                      The message and signature are bundled together, then
                      encrypted
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Encryption Details:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      AES-GCM mode provides authenticated encryption with
                      associated data (AEAD)
                    </li>
                    <li>
                      RSA-OAEP with SHA-256 for key encapsulation mechanism
                      (KEM)
                    </li>
                    <li>
                      The encrypted package includes: RSA-encrypted AES key, IV,
                      and encrypted data
                    </li>
                    <li>
                      Base64 encoding is used for the final encrypted package
                      transport
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Digital Signatures:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      ECDSA with P-384 curve and SHA-384 for message signing
                    </li>
                    <li>Raw message is signed before any encryption occurs</li>
                    <li>
                      Signature is included in the encrypted package to prevent
                      tampering
                    </li>
                    <li>
                      Verification occurs after decryption using the original
                      message
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Decryption Process:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      First, RSA-OAEP decrypts the AES key using receiver's
                      private key
                    </li>
                    <li>
                      AES-GCM decryption using the recovered key and original IV
                    </li>
                    <li>
                      Message and signature are separated from decrypted data
                    </li>
                    <li>
                      Finally, ECDSA signature is verified against the decrypted
                      message
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Security Considerations:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Fresh AES key and IV for each message prevents key reuse
                    </li>
                    <li>
                      GCM mode provides integrity protection of the ciphertext
                    </li>
                    <li>
                      Sign-then-encrypt pattern ensures signature integrity
                    </li>
                    <li>
                      Use of authenticated encryption prevents tampering attacks
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            {/* Sender Side */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="text-center space-y-2">
                <div className="w-24 h-24 flex items-center justify-center bg-blue-100 rounded-full mx-auto">
                  <Smartphone className="w-12 h-12 text-blue-600" />
                </div>
                <div className="text-sm font-medium">Sender</div>
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Enter a message to sign and encrypt"
                  />
                  {message && !encryptedData && (
                    <button
                      onClick={signAndEncryptMessage}
                      disabled={loading || !encryptKeyPair || !signKeyPair}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
                    >
                      <Lock className="w-4 h-4" />
                      Sign & Encrypt
                    </button>
                  )}
                </div>

                {signatureVisible && (
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                      <Shield className="w-4 h-4" />
                      Digital Signature Added
                    </div>
                  </div>
                )}

                {encryptedData && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all border">
                      {encryptedData.slice(0, 100)}...
                    </div>
                    {!isReceived && (
                      <button
                        onClick={handleSend}
                        disabled={loading || isSending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300"
                      >
                        <Send className="w-4 h-4" />
                        Send Message
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center justify-center pt-12">
              <ArrowRight
                className={`w-8 h-8 transition-all duration-500 ${
                  isSending ? "text-green-500 scale-125" : "text-gray-400"
                }`}
              />
            </div>

            {/* Receiver Side */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="text-center space-y-2">
                <div className="w-24 h-24 flex items-center justify-center bg-purple-100 rounded-full mx-auto">
                  <Server className="w-12 h-12 text-purple-600" />
                </div>
                <div className="text-sm font-medium">Receiver</div>
              </div>

              <div className="w-full space-y-4">
                {encryptedData && isReceived && !decryptedMessage && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setTamperMode(!tamperMode)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {tamperMode
                        ? "Restore message"
                        : "Alter Original Message"}
                    </button>

                    <button
                      onClick={decryptAndVerifyMessage}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded disabled:bg-purple-300"
                    >
                      <Unlock className="w-4 h-4" />
                      Decrypt & Verify
                    </button>
                  </div>
                )}

                {decryptedMessage && (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded border ${
                        verificationStatus === "verified"
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        {verificationStatus === "verified" ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">
                              Signature Verified
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-red-600">
                              Invalid Signature
                            </span>
                          </>
                        )}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        {decryptedMessage}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { WebCryptoDemo };
