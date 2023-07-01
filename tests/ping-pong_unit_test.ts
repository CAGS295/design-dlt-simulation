import { Clarinet, Tx, type Chain, type Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts'
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts'
import fc from 'https://cdn.skypack.dev/fast-check@3.10.0'

// Assume accounts satisfies sampling over the whole address population.
Clarinet.test({
  name: 'Only the deployer can end a game.',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!.address
    const range_inclusive = { min: 0, max: accounts.size - 1 }

    fc.assert(fc.property(fc.constantFrom(...accounts.values()), fc.context(), ({ address }, ctx) => {

      const block = chain.mineBlock([
        Tx.contractCall(
          'ping-pong', 'end-game', [], address)
      ])

      ctx.log(`Important trace: caller is deployer: ${address === deployer}`)

      const result = block.receipts[0].result
      if (address === deployer) {
        result
          .expectOk()
          .expectAscii('Game reset!')
      } else {
        result
          .expectErr()
          .expectAscii('Not the owner')
      }
    }), { verbose: true })
  }
})