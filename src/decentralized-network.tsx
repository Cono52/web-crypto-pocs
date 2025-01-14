import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Network,
  Shield,
  Clock,
  Wifi,
  Trash,
  Power,
  PlusCircle,
} from "lucide-react";

/**
  This implementation includes several realistic P2P network features:

  Simulated Network Conditions:
  * Variable latency with random jitter
  * All network operations are delayed using simulateLatency
  * Peers have "last seen" timestamps that update randomly

  Proper Peer Discovery:
  * Peers generate IDs from their public keys
  * Uses XOR metric to find closest peers (similar to Kademlia DHT)
  * Each peer maintains its own routing table
  * Discovery happens gradually with simulated network delays

  Visualization Features:
  * Interactive latency control
  * Network topology visualization
  * Real-time discovery logs
  * Peer status indicators
*/

const DecentralizedNetwork = () => {
  const peers = useRef([]);
  const started = useRef(false);
  const [networkLatency, setNetworkLatency] = useState(200); // ms
  const [forceKey, setForceKey] = useState(0);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [discoveryLogs, setDiscoveryLogs] = useState([]);
  const [dragPeer, setDragPeer] = useState(null);

  useEffect(() => {
    const cut = discoveryLogs;
    if (discoveryLogs.length > 500) {
      while (cut.length > 500) {
        discoveryLogs.shift();
      }
      setDiscoveryLogs(cut);
    }
  }, [discoveryLogs]);

  // Simulate network delay
  const simulateLatency = async (operation) => {
    const jitter = Math.random() * 50; // Add random jitter
    const delay = networkLatency + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return operation();
  };

  // Generate a peer ID from public key
  const generatePeerId = async (publicKey) => {
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "raw",
      publicKey
    );
    const hash = await window.crypto.subtle.digest("SHA-256", publicKeyBuffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12); // Take first 12 chars for readability
  };

  // Create a new peer with keys
  const createPeer = async (opt: { latency?: boolean } = {}) => {
    const cp = async () => {
      const signingKeys = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-384",
        },
        true,
        ["sign", "verify"]
      );

      const id = await generatePeerId(signingKeys.publicKey);
      // Convert first 4 bytes of ID to coordinates
      const idBytes = BigInt(`0x${id}`);
      const xPosition = Number(idBytes & BigInt(0xffff)) / 65535;
      const yPosition =
        Number((idBytes >> BigInt(16)) & BigInt(0xffff)) / 65535;

      return {
        id,
        signingKeys,
        routingTable: new Map(),
        lastSeen: Date.now(),
        status: "discovering",
        x: xPosition * 600, // Scale to pixel values
        y: yPosition * 200,
      };
    }

    return opt?.latency ? simulateLatency(cp) : await cp();
  };

  // Calculate XOR distance between peers
  const calculateDistance = (id1, id2) => {
    const n1 = BigInt(`0x${id1}`);
    const n2 = BigInt(`0x${id2}`);
    return n1 ^ n2;
  };

  // Find closest peers using XOR metric
  const findClosestPeers = (targetId, allPeers, count = 3) => {
    return allPeers
      .filter((p) => p.id !== targetId)
      .sort((a, b) => {
        const distA = calculateDistance(a.id, targetId);
        const distB = calculateDistance(b.id, targetId);
        return distA < distB ? -1 : 1;
      })
      .slice(0, count);
  };

  const discoverPeers = async (peer) => {
    const discover = async () => {
      const closestPeers = findClosestPeers(peer.id, peers.current);

      setDiscoveryLogs((prev) => [
        ...prev,
        `Peer ${peer.id.slice(0, 6)} discovering closest peers...`,
      ]);

      // Update routing tables
      peers.current = peers.current.map((p) => {
        if (p.id === peer.id) {
          // Get current routing table peer IDs
          const currentPeerIds = [...p.routingTable.keys()];

          // Clear routing table if no closest peers found
          if (closestPeers.length === 0) {
            p.routingTable.clear();
            setDiscoveryLogs((prev) => [
              ...prev,
              `Peer ${peer.id.slice(
                0,
                6
              )} cleared routing table - no peers found`,
            ]);
          } else {
            // Get new closest peer IDs
            const newPeerIds = closestPeers.map((peer) => peer.id);

            // Remove peers that are no longer in closest peers
            currentPeerIds.forEach((id) => {
              if (!newPeerIds.includes(id)) {
                p.routingTable.delete(id);
                setDiscoveryLogs((prev) => [
                  ...prev,
                  `Peer ${peer.id.slice(0, 6)} removed ${id.slice(
                    0,
                    6
                  )} from routing table`,
                ]);
              }
            });

            // Add/update closest peers
            closestPeers.forEach((close) => {
              p.routingTable.set(close.id, {
                distance: calculateDistance(peer.id, close.id),
                lastSeen: Date.now(),
              });
            });
          }
          p.status = "connected";
        }
        return p;
      });

      setDiscoveryLogs((prev) => [
        ...prev,
        `Peer ${peer.id.slice(0, 6)} found ${closestPeers.length} close peers`,
      ]);
    };

    await simulateLatency(discover);
  };

  const makeAnotherPeer = async () => {
    const peer = await createPeer({ latency: false });
    peers.current.push(peer);
  };

  // Initialize network with some peers
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    peers.current = [];

    const initNetwork = async () => {
      for (let i = 0; i < 5; i++) {
        const peer = await createPeer();
        peers.current.push(peer);
        setDiscoveryLogs((prev) => [
          ...prev,
          `Peer ${peer.id.slice(0, 6)} joined the network`,
        ]);
      }

      // Start discovery process for each peer
      console.log("start discovery...");
      for (const peer of peers.current) {
        await discoverPeers(peer);
      }
    };

    initNetwork();
  }, [networkLatency]);

  // Periodically update network status
  useEffect(() => {
    const interval = setInterval(() => {
      peers.current = peers.current.map((peer) => {
        discoverPeers(peer);
        return {
          ...peer,
          lastSeen: Date.now() - Math.random() * 5000, // Simulate some peers being less active
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div key={forceKey+peers.current.length} className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-2">
            <Network className="w-6 h-6" />
            P2P Network with DHT Discovery
          </CardTitle>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Demonstrates how peers find each other in a decentralized network
              using:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Kademlia-style peer discovery (peers find others using XOR
                distance, node ids generated using Browser "Crypto" API with
                ECDSA)
              </li>
              <li>Realistic network latency and jitter</li>
              <li>Dynamic routing tables that update as network changes</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Network Controls */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4" />
              <div className="flex-1">
                <label className="text-sm font-medium">
                  Network Latency (click for 5 or slide to break to crash your
                  tab)
                </label>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  value={networkLatency}
                  onChange={(e) => {
                    started.current = false;
                    setNetworkLatency(Number(e.target.value));
                  }}
                  className="w-full"
                />
              </div>
              <div className="text-sm">{networkLatency}ms</div>
            </div>
            <div className="relative text-sm text-gray-600 space-y-2">
              {/* Peer count */}
              <div className="flex items-center gap-2">
                <p>{`Peer count: ${peers.current.length}`}</p>
                <PlusCircle
                  style={{
                    cursor: "pointer",
                  }}
                  className="w-5 h-5 text-red-500 hover:text-red-700"
                  onClick={() => makeAnotherPeer()}
                />
              </div>
              <br />
              {`Connection count: ${
                (peers.current.length &&
                  peers.current?.reduce(
                    (agg, curr) => curr.routingTable.size + agg,
                    0
                  )) ||
                0
              }`}
            </div>
            {/* Peer Network */}
            <div
              className="relative bg-gray-50 p-4 rounded-lg min-h-[300px]"
              onMouseMove={(e) => {
                if (dragPeer) {
                  const newX = e.clientX - dragPeer.startX;
                  const newY = e.clientY - dragPeer.startY;
                  peers.current = peers.current.map((p) =>
                    p.id === dragPeer.id ? { ...p, x: newX, y: newY } : p
                  );

                  setForceKey(() => newX + newY);
                }
              }}
              onMouseUp={() => setDragPeer(null)}
              onMouseLeave={() => setDragPeer(null)}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {peers.current.map((peer) => {
                  // Get all connections from routing table
                  return [...peer.routingTable.keys()].map((targetId) => {
                    // Find target peer
                    const targetPeer = peers.current.find(
                      (p) => p.id === targetId
                    );
                    if (!targetPeer) return null;

                    // Draw line from peer to target
                    return (
                      <line
                        key={`${peer.id}-${targetId}`}
                        x1={peer.x + 30} // Add offset to center of peer div
                        y1={peer.y + 30}
                        x2={targetPeer.x + 30}
                        y2={targetPeer.y + 30}
                        stroke="#94a3b8" // slate-400
                        strokeWidth={1}
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  });
                })}
                {/* Define arrowhead marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                  </marker>
                </defs>
              </svg>
              {peers.current.map((peer) => (
                <div
                  key={peer.id}
                  className={`absolute p-3 rounded-lg border-2 transition-all duration-500
                    ${
                      peer.status === "discovering"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-green-50 border-green-200"
                    }
                    ${
                      selectedPeer?.id === peer.id ? "ring-2 ring-blue-500" : ""
                    }
                  `}
                  style={{
                    transform: `translate(${peer.x}px, ${peer.y}px)`,
                    cursor: "pointer",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // This also prevents text selection
                    setDragPeer({
                      id: peer.id,
                      startX: e.clientX - peer.x,
                      startY: e.clientY - peer.y,
                    });
                  }}
                  onClick={() => {
                    setSelectedPeer(peer);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-mono">
                        {peer.id.slice(0, 6)}
                      </span>
                    </div>
                    <Power
                      onClick={() => {
                        peers.current = peers.current.filter(
                          (p) => p.id !== peer.id
                        );
                      }}
                      className="w-3 h-3 text-red-500 hover:text-red-700"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {peer.routingTable.size} connections <br />
                    {[...peer.routingTable.keys()].map((s) => (
                      <p key={peer.routingTable.get(s).distance}>{`${s.slice(
                        0,
                        6
                      )}: Dist ${peer.routingTable.get(s).distance}`}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Wifi className="w-3 h-3" />
                    <span className="text-xs">
                      {Math.round((Date.now() - peer.lastSeen) / 1000)}s ago
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Discovery Logs */}
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto">
              {discoveryLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { DecentralizedNetwork };
