import { DecentralizedNetwork } from "./decentralized-network";
import { WebCryptoDemo } from "./web-simple-encrypt-decrypt";
import { CryptoBenchmark } from "./crypto-benchmark";

const App = () => {
  return (
    <>
      <div className="w-full bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold tracking-tight">
            An exploration into the browser-based Web Crypto API
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Understanding modern browser cryptography through small proof of concepts / demos.
          </p>
        </div>
      </div>
      <DecentralizedNetwork />
      <WebCryptoDemo />
      <CryptoBenchmark />
      <div className="m-10 text-center text-sm text-gray-500">
        {"Under continous tinkering by me - Conor O'Flanagan - last updated Jan 14th 2025"}
      </div>
    </>
  );
};

export default App;
