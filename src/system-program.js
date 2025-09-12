// systemProgram.js
import { createTransaction, decodeExecutionResult } from '@getlea/ltm';
import transferManifest from '../manifests/transfer.json' with { type: 'json' };
import mintManifest from '../manifests/mint.json' with { type: 'json' };
import burnManifest from '../manifests/burn.json' with { type: 'json' };
import publishKeysetManifest from '../manifests/publish_keyset.json' with { type: 'json' };
import mintWhitelistManifest from '../manifests/mint_whitelist.json' with { type: 'json' };
import getAllowedMintManifest from '../manifests/get_allowed_mint.json' with { type: 'json' };
import getBalanceManifest from '../manifests/get_balance.json' with { type: 'json' };
import getCurrentSupplyManifest from '../manifests/get_current_supply.json' with { type: 'json' };

const clone = (x) =>
(typeof structuredClone === 'function'
  ? structuredClone(x)
  : JSON.parse(JSON.stringify(x)));

const withConstants = (manifest, constants) => {
  const m = clone(manifest);
  m.constants = { ...(m.constants || {}), ...constants };
  return m;
};

async function buildTxAndDecoder(baseManifest, constants = {}, signers = {}) {
  const manifestUsed = Object.keys(constants).length
    ? withConstants(baseManifest, constants)
    : clone(baseManifest);

  const tx = await createTransaction(manifestUsed, signers);

  // decode() is bound to the exact manifest used
  const decode = async (resultBuffer) => {
    return decodeExecutionResult(resultBuffer, manifestUsed);
  };

  return { tx, decode };
}

export const SystemProgram = {
  transfer: async (fromKeyset, toAddress, amount) => {
    const signers = { publisher: fromKeyset };
    const constants = { receiver: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(transferManifest, constants, signers);
  },

  mint: async (fromKeyset, toAddress, amount) => {
    const signers = { minter: fromKeyset };
    const constants = { recipient: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mintManifest, constants, signers);
  },

  burn: async (fromKeyset, amount) => {
    const signers = { burner: fromKeyset };
    const constants = { amount: String(amount) };
    return buildTxAndDecoder(burnManifest, constants, signers);
  },

  publishKeyset: async (fromKeyset) => {
    const signers = { publisher: fromKeyset };
    return buildTxAndDecoder(publishKeysetManifest, {}, signers);
  },

  mintWhitelist: async (fromKeyset, toAddress, amount) => {
    const signers = { authority: fromKeyset };
    const constants = { whitelistAddress: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mintWhitelistManifest, constants, signers);
  },

  getAllowedMint: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(getAllowedMintManifest, constants, {});
  },

  getBalance: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(getBalanceManifest, constants, {});
  },

  getCurrentSupply: async () => {
    return buildTxAndDecoder(getCurrentSupplyManifest, {}, {});
  },
};
