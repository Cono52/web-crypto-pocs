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
} from "lucide-react";

const WebCryptoDemo = () => {
  const [keyPair, setKeyPair] = useState(null);
  const [message, setMessage] = useState("Whats up!");
  const [encryptedMessage, setEncryptedMessage] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isReceived, setIsReceived] = useState(false);

  useEffect(() => {
    generateKeyPair();
  }, []);

  const generateKeyPair = async () => {
    try {
      setLoading(true);
      setError(null);
      const newKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );
      setKeyPair(newKeyPair);
    } catch (err) {
      setError("Failed to generate key pair: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const encryptMessage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add random padding to ensure different ciphertext each time
      const encoder = new TextEncoder();
      const randomPadding = window.crypto.getRandomValues(new Uint8Array(16));
      const messageData = encoder.encode(message);

      // Combine padding and message
      const dataToEncrypt = new Uint8Array(
        randomPadding.length + messageData.length
      );
      dataToEncrypt.set(randomPadding);
      dataToEncrypt.set(messageData, randomPadding.length);

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        keyPair.publicKey,
        dataToEncrypt
      );

      const base64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      setEncryptedMessage(base64);
    } catch (err) {
      setError("Encryption failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const decryptMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      const binaryStr = atob(encryptedMessage);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        keyPair.privateKey,
        bytes
      );

      // Remove the random padding we added during encryption
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted.slice(16));
      setDecryptedMessage(decryptedText);
    } catch (err) {
      setError("Decryption failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    setIsReceived(false);
    setIsSending(true);
    // Simulate network transmission
    setTimeout(() => {
      setIsSending(false);
      setIsReceived(true);
    }, 1000);
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              End-to-End Encryption Demo
            </CardTitle>
            <CardDescription>
              Secure message exchange between phone and server
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-start justify-between gap-4 mb-8">
              {/* Client Device Side */}
              <div className="flex-1 flex flex-col items-center gap-4">
                <div className="text-center space-y-2">
                  <div className="w-24 h-24 flex items-center justify-center bg-blue-100 rounded-full mx-auto">
                    <Smartphone className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="text-sm font-medium">Client Device</div>
                </div>

                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-2 border rounded"
                      placeholder="Enter a message to encrypt"
                    />
                    {message && !encryptedMessage && (
                      <button
                        onClick={encryptMessage}
                        disabled={loading || !keyPair}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
                      >
                        <Lock className="w-4 h-4" />
                        Encrypt Message
                      </button>
                    )}
                  </div>

                  {encryptedMessage && (
                    <div className="space-y-2">
                      <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all border">
                        {encryptedMessage}
                      </div>
                      {!isReceived && (
                        <button
                          onClick={handleSend}
                          disabled={loading || isSending}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300"
                        >
                          <Send className="w-4 h-4" />
                          Send to Server
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

              {/* Server Side */}
              <div className="flex-1 flex flex-col items-center gap-4">
                <div className="text-center space-y-2">
                  <div className="w-24 h-24 flex items-center justify-center bg-purple-100 rounded-full mx-auto">
                    <Server className="w-12 h-12 text-purple-600" />
                  </div>
                  <div className="text-sm font-medium">Server</div>
                </div>

                <div className="w-full space-y-4">
                  {encryptedMessage && isReceived && !decryptedMessage && (
                    <button
                      onClick={decryptMessage}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded disabled:bg-purple-300"
                    >
                      <Unlock className="w-4 h-4" />
                      Decrypt Message
                    </button>
                  )}

                  {decryptedMessage && (
                    <div className="bg-purple-50 p-4 rounded border">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-purple-600" />
                        Decrypted Message:
                      </div>
                      <div className="bg-white p-2 rounded border">
                        {decryptedMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-500">
        Made by Conor O'Flanagan
      </div>
    </>
  );
};

export default WebCryptoDemo;
