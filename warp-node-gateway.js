/**
 * Warp Network Router & Cryptographic Node Gateway
 * File: warp-node-gateway.js
 */

const crypto = require('crypto');

class WarpNodeGateway {
    constructor() {
        // In-memory mock database for library tiles
        this.tileDatabase = new Map();
        // Network state tracking
        this.nodeState = {
            totalCapacity: 1000,
            activeConnections: 0
        };
    }

    /**
     * Register an unmodified API manifest into the database
     */
    registerTile(manifest) {
        const id = manifest.metadata.tileId;
        this.tileDatabase.set(id, {
            manifest,
            stats: { activeDemand: 10 }
        });
        return { registered: true, tileId: id };
    }

    /**
     * Calculate dynamic market cost based on load & capacity
     */
    calculateDynamicPrice(tileId) {
        const entry = this.tileDatabase.get(tileId);
        if (!entry) throw new Error("Tile not found in library database");

        const P_base = entry.manifest.spec.economics.baseCostTokens;
        const D_t = entry.stats.activeDemand;
        const S_max = entry.manifest.spec.economics.maxSupplyCapacity;
        const alpha = entry.manifest.spec.economics.alphaDampening || 0.85;
        const gamma = 1.5;
        const epsilon = 0.01;

        // Formula: P(t) = P_base * (1 + alpha * (D(t) / (S_max - D(t) + epsilon))^gamma)
        const utilizationRatio = D_t / (S_max - D_t + epsilon);
        const dynamicMultiplier = 1 + alpha * Math.pow(utilizationRatio, gamma);
        
        return parseFloat((P_base * dynamicMultiplier).toFixed(6));
    }

    /**
     * Secure Execution Pipeline using Elliptic Curve Cryptography (ECDH)
     */
    executeSecureWarpPipeline(tileId, clientPublicKeyHex, userWalletBalance) {
        const entry = this.tileDatabase.get(tileId);
        if (!entry) return { status: 404, message: "Tile missing" };

        const currentCost = this.calculateDynamicPrice(tileId);

        // 1. Token balance validation
        if (userWalletBalance < currentCost) {
            return { status: 402, message: "Insufficient token balance" };
        }

        // 2. ECDH Key Exchange (secp256k1)
        const nodeECDH = crypto.createECDH('secp256k1');
        nodeECDH.generateKeys();

        const clientPublicKey = Buffer.from(clientPublicKeyHex, 'hex');
        const sharedSecret = nodeECDH.computeSecret(clientPublicKey);

        // Derive AES-256 Key using SHA-256 over shared secret
        const derivedKey = crypto.createHash('sha256').update(sharedSecret).digest();

        // 3. Raw Payload Generation (Simulated Metamaterial Container Fetch)
        const rawPayload = JSON.stringify({
            timestamp: Date.now(),
            category: entry.manifest.metadata.category,
            dataStream: `[MUTABLE_DATA_PACKET::${entry.manifest.metadata.name}]`,
            verified: true
        });

        // 4. AES-256-GCM Encryption
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
        
        let encrypted = cipher.update(rawPayload, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        // Increment demand metric
        entry.stats.activeDemand += 1;

        // 5. Return Container Payload
        return {
            status: 200,
            costDebited: currentCost,
            handshake: {
                nodePublicKey: nodeECDH.getPublicKey('hex'),
                iv: iv.toString('hex'),
                authTag: authTag
            },
            encryptedPayload: encrypted
        };
    }
}

// Module export for gateway execution
module.exports = WarpNodeGateway;
