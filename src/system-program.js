import { createTransaction, decodeExecutionResult } from '@leachain/ltm';
import transferManifest from '../manifests/transfer.json' with { type: 'json' };
import mintManifest from '../manifests/mint.json' with { type: 'json' };
import burnManifest from '../manifests/burn.json' with { type: 'json' };
import publishKeysetManifest from '../manifests/publish_keyset.json' with { type: 'json' };
import mintWhitelistManifest from '../manifests/mint_whitelist.json' with { type: 'json' };
import getAllowedMintManifest from '../manifests/get_allowed_mint.json' with { type: 'json' };
import getBalanceManifest from '../manifests/get_balance.json' with { type: 'json' };
import getCurrentSupplyManifest from '../manifests/get_current_supply.json' with { type: 'json' };

const updateManifestConstants = (manifest, constants) => {
  return {
    ...manifest,
    constants: {
      ...manifest.constants,
      ...constants,
    }
  };
}

export const SystemProgram = {
  /**
   * Creates a transfer transaction.
   */
  transfer: async (fromKeyset, toAddress, amount) => {
    const signers = { publisher: fromKeyset };
    const constants = {
      receiver: `$addr(${toAddress})`,
      amount: amount.toString()
    };
    const manifest = updateManifestConstants(transferManifest, constants);
    return await createTransaction(manifest, signers);
  },

  /**
   * Creates a mint transaction.
   */
  mint: async (fromKeyset, toAddress, amount) => {
    const signers = { minter: fromKeyset };
    const constants = {
      recipient: `$addr(${toAddress})`,
      amount: amount.toString(),
    };

    const manifest = updateManifestConstants(mintManifest, constants);
    return await createTransaction(manifest, signers);
  },

  /**
   * Creates a burn transaction.
   */
  burn: async (fromKeyset, amount) => {
    const signers = { burner: fromKeyset };
    const constants = {
      amount: amount.toString(),
    };
    const manifest = updateManifestConstants(burnManifest, constants);
    return await createTransaction(manifest, signers);
  },

  /**
   * Creates a publish keyset transaction.
   */
  publishKeyset: async (fromKeyset) => {
    const signers = { publisher: fromKeyset };
    return await createTransaction(publishKeysetManifest, signers);
  },

  /**
   * Creates a mint whitelist transaction.
   */
  mintWhitelist: async (fromKeyset, toAddress, amount) => {
    const signers = { authority: fromKeyset };
    const constants = {
      whitelistAddress: `$addr(${toAddress})`,
      amount: amount.toString(),
    };
    const manifest = updateManifestConstants(mintWhitelistManifest, constants);
    return await createTransaction(manifest, signers);
  },

  /**
   * Creates a get allowed mint transaction.
   */
  getAllowedMint: async (toAddress) => {
    const constants = {
      address: `$addr(${toAddress})`,
    };
    const manifest = updateManifestConstants(getAllowedMintManifest, constants);
    return await createTransaction(manifest, {});
  },

  /**
   * Creates a get balance transaction.
   */
  getBalance: async (toAddress) => {
    const constants = {
      address: `$addr(${toAddress})`,
    };
    const manifest = updateManifestConstants(getBalanceManifest, constants);
    return await createTransaction(manifest, {});
  },

  /**
   * Creates a get current supply transaction.
   */
  getCurrentSupply: async () => {
    return await createTransaction(getCurrentSupplyManifest, {});
  },

  parseGetCurrentSupply: async (resultBuffer) => {
    const decoded = await decodeExecutionResult(resultBuffer, getCurrentSupplyManifest);
    console.log('[PASS] Decoded Result:');
    console.dir(decoded, { depth: null });
    return decoded;
  }
};
