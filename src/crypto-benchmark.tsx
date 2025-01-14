import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, BarChart2 } from "lucide-react";

const CryptoBenchmark = () => {
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [usePregenKeys, setUsePregenKeys] = useState(false);
  const [pregenKeyPairs, setPregenKeyPairs] = useState(null);

  // Pre-generate a pool of AES keys
  const generateKeyPool = async (count) => {
    const keys = [];
    for (let i = 0; i < count; i++) {
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );
      keys.push(aesKey);
    }
    return keys;
  };

  // Generate RSA and ECDSA keypairs
  const generateKeyPairs = async () => {
    const rsaKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const ecdsaKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-384",
      },
      true,
      ["sign", "verify"]
    );

    return { rsaKeyPair, ecdsaKeyPair };
  };

  // Benchmark single message encryption
  const benchmarkEncryption = async (
    message,
    keyPairs,
    pregenAESKey = null
  ) => {
    const start = performance.now();

    // Measure AES key generation
    const aesKeyStart = performance.now();
    const aesKey =
      pregenAESKey ||
      (await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      ));
    const aesKeyTime = performance.now() - aesKeyStart;

    // Measure signing
    const signStart = performance.now();
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-384" },
      },
      keyPairs.ecdsaKeyPair.privateKey,
      messageBytes
    );
    const signTime = performance.now() - signStart;

    // Measure AES encryption
    const aesEncryptStart = performance.now();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      messageBytes
    );
    const aesEncryptTime = performance.now() - aesEncryptStart;

    // Measure RSA encryption of AES key
    const rsaStart = performance.now();
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      keyPairs.rsaKeyPair.publicKey,
      exportedAesKey
    );
    const rsaTime = performance.now() - rsaStart;

    const totalTime = performance.now() - start;

    return {
      aesKeyGeneration: aesKeyTime,
      signing: signTime,
      aesEncryption: aesEncryptTime,
      rsaEncryption: rsaTime,
      total: totalTime,
    };
  };

  const runBenchmark = async () => {
    setIsRunning(true);
    try {
      const keyPairs = pregenKeyPairs || (await generateKeyPairs());
      if (!pregenKeyPairs) {
        setPregenKeyPairs(keyPairs);
      }

      const aesKeyPool = usePregenKeys ? await generateKeyPool(100) : null;

      const messages = [
        "Short message",
        "A".repeat(1000), // 1KB
        "A".repeat(10000), // 10KB
      ];

      const results = [];

      for (const msg of messages) {
        const runs = [];
        // Run each test 5 times
        for (let i = 0; i < 5; i++) {
          const result = await benchmarkEncryption(
            msg,
            keyPairs,
            usePregenKeys ? aesKeyPool[i] : null
          );
          runs.push(result);
        }

        // Calculate averages
        const avgResult = {
          messageSize: msg.length,
          aesKeyGeneration:
            runs.reduce((a, b) => a + b.aesKeyGeneration, 0) / runs.length,
          signing: runs.reduce((a, b) => a + b.signing, 0) / runs.length,
          aesEncryption:
            runs.reduce((a, b) => a + b.aesEncryption, 0) / runs.length,
          rsaEncryption:
            runs.reduce((a, b) => a + b.rsaEncryption, 0) / runs.length,
          total: runs.reduce((a, b) => a + b.total, 0) / runs.length,
        };
        results.push(avgResult);
      }

      setBenchmarkResults(results);
    } catch (error) {
      console.error("Benchmark error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const formatTime = (ms) => {
    return `${ms.toFixed(2)}ms`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6" />
            Cryptographic Operations Benchmark (you can very it with ChromeDev tools CPU throttle)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={usePregenKeys}
                  onChange={(e) => setUsePregenKeys(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Use Pre-generated AES Keys
              </label>
              <button
                onClick={runBenchmark}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
              >
                <Timer className="w-4 h-4" />
                {isRunning ? "Running..." : "Run Benchmark"}
              </button>
            </div>

            {benchmarkResults && (
              <div className="space-y-6">
                {benchmarkResults.map((result, i) => (
                  <div key={i} className="space-y-2">
                    <h3 className="font-medium">
                      Message Size: {result.messageSize} bytes
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded">
                        <div className="text-sm font-medium mb-2">
                          Operation Times:
                        </div>
                        <ul className="space-y-1 text-sm">
                          <li className="flex justify-between">
                            <span>AES Key Generation:</span>
                            <span>{formatTime(result.aesKeyGeneration)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>ECDSA Signing:</span>
                            <span>{formatTime(result.signing)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>AES Encryption:</span>
                            <span>{formatTime(result.aesEncryption)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>RSA Key Encryption:</span>
                            <span>{formatTime(result.rsaEncryption)}</span>
                          </li>
                        </ul>
                      </div>
                      <div className="p-4 bg-blue-50 rounded">
                        <div className="text-sm font-medium mb-2">
                          Total Time:
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatTime(result.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { CryptoBenchmark };
