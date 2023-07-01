import { Clarinet, Tx, type Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts'
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts'
import fc from 'https://cdn.skypack.dev/fast-check@3.10.0'
import PingPongModel from '../src/models.ts'
type ChainT = { chain: Chain, ctx: fc.Context }

class EndGameCommand implements fc.Command<PingPongModel, ChainT> {
    constructor(caller: string, deployer: string) {
        this.caller = caller
        this.deployer = deployer
    }

    check(m: Readonly<PingPongModel>): boolean {
        return true
    }

    run(m: Model, { chain, ctx }: ChainT): void {
        m.actionCounter++

        const block = chain.mineBlock([
            Tx.contractCall(
                'ping-pong', 'end-game', [], this.caller)
        ])

        ctx.log(`end ${this} ${m.actionCounter}`)

        const result = block.receipts[0].result
        if (this.caller === this.deployer) {
            result
                .expectOk()
                .expectAscii('Game reset!')
            m.startable = true
            m.optionHitter = null
            m.optionReceiver = null
        } else {
            result
                .expectErr()
                .expectAscii('Not the owner')
        }
    }

    toString() {
        return `{ End: caller: ${this.caller}, deployer: ${this.deployer}`;
    }

}

class NewGameCommand implements fc.Command<PingPongModel, ChainT> {
    constructor(player1: string, player2: string, caller: string, deployer: string) {
        this.player1 = player1
        this.player2 = player2
        this.caller = caller
        this.deployer = deployer
    }

    check(m: Readonly<PingPongModel>): boolean {
        //always reachable
        //Usefulness varies depending on how you want to explore the model.
        return true
        // this may suffer if the event is not well connected in complex models. Making the event very hard to sample.
        // return m.startable
    }

    run(m: Model, { chain, ctx }: ChainT): void {
        m.actionCounter++
        const p1 = types.principal(this.player1)
        const p2 = types.principal(this.player2)

        const block = chain.mineBlock([
            Tx.contractCall(
                'ping-pong', 'new-game', [p1, p2], this.caller)
        ])

        const result = block.receipts[0].result
        if (this.caller === this.deployer) {
            if (!m.startable) {
                result
                    .expectErr()
                    .expectAscii('Game in progress')
            }
            else {
                if (this.player1 === this.player2) {
                    result
                        .expectErr()
                        .expectAscii('self-play')

                } else {
                    result
                        .expectOk()
                        .expectAscii('New Game!')
                    m.startable = false
                    m.optionHitter = this.player1
                    m.optionReceiver = this.player2
                }
            }
        } else {
            result
                .expectErr()
                .expectAscii('Not the owner')
        }

    }

    toString() {
        return `{ New: player1: ${this.player1}, player2: ${this.player2}, caller: ${this.caller}, deployer: ${this.deployer} }`;
    }
}

class PlayGameCommand implements fc.Command<PingPongModel, ChainT> {
    constructor(caller: string, deployer: string) {
        this.caller = caller
        this.deployer = deployer
    }

    check(m: Readonly<PingPongModel>): boolean {
        return !m.startable
    }

    run(m: Model, { chain, ctx }: ChainT): void {
        m.actionCounter++

        const block = chain.mineBlock([
            Tx.contractCall(
                'ping-pong', 'play', [], this.caller)
        ])

        ctx.log(`play ${m.optionHitter} ${m.optionReceiver}`)

        const result = block.receipts[0].result
        if (m.optionHitter && this.caller === m.optionHitter) {
            result
                .expectOk()
                .expectAscii('Cool!')

            const tmp = m.optionHitter
            m.optionHitter = m.optionReceiver
            m.optionReceiver = tmp
        } else {
            result
                .expectErr()
                .expectAscii('Not your turn to move.')
        }
    }

    toString() {
        return `{ Play: caller: ${this.caller}, deployer: ${this.deployer} }`;
    }
}

Clarinet.test({
    name: 'Ping-Pong model: start-ping-end',
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!.address

        const commands = [
            fc.constantFrom(...accounts.values())
                .map(account =>
                    new EndGameCommand(account.address, deployer)
                ),
            fc.constantFrom(...accounts.values())
                .map(account =>
                    new PlayGameCommand(account.address, deployer)
                ),
            fc.record(
                {
                    p1: fc.constantFrom(...accounts.values()).map((x) => x.address),
                    p2: fc.constantFrom(...accounts.values()).map((x) => x.address),
                    c: fc.constantFrom(...accounts.values()).map((x) => x.address),
                    d: fc.constantFrom(deployer)
                }
            ).noShrink()
                .map(({ p1, p2, c, d }) => new NewGameCommand(p1, p2, c, d)
                ),
        ]

        const model: PingPongModel = {
            actionCounter: 0,
            startable: true,
            optionHitter: null,
            optionReceiver: null
        };

        fc.assert(fc.property(
            fc.commands(commands, { size: '+1' }),
            fc.context(),
            (commands, ctx) => {
                const initialState = () => ({ model: model, real: { chain: chain, ctx: ctx } });
                fc.modelRun(initialState, commands);
            })
            , { numRuns: 100 }); // Run `numRuns` times.
    }
});
