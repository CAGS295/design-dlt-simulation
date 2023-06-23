import { Subject, observeOn, asyncScheduler } from 'rxjs'

type Message = 'Ping' | 'Pong'
type Destination = string | 'Any'
type EventBus = Subject<{ sender: Actor, destination: Destination, message: Message }>

class Actor {
    readonly name: string
    readonly eventBus: EventBus
    eventId: number = 0

    constructor(name: string) {
        this.name = name
        this.eventBus = new Subject<{ sender: Actor, message: Message, destination: Destination }>()
    }

    async handleMessage(sender: Actor, message: Message) {
        this.eventId++
        process.stdout.write(`\r${this.name} ${this.eventId}: ${sender.name} ${message}`)
    }

    broadcast(message: Message, destination = 'Any'): void {
        this.eventBus.next({ sender: this, message, destination })
    }

    subscribe(actor: Actor): void {
        actor.eventBus
            .pipe(observeOn(asyncScheduler))
            .subscribe(async ({ sender, message, destination }) => {
                if (destination === 'Any' || this.name === destination) {
                    await this.handleMessage(sender, message)
                }
            })
    }
}

class PingPong extends Actor {
    async handleMessage(sender: Actor, message: Message) {
        super.handleMessage(sender, message)
        switch (message) {
            case 'Ping':
                this.broadcast('Pong', sender.name)
                break
            case 'Pong':
                this.broadcast('Ping', sender.name)
                break
        }
    }
}

class ThroughputPerSecond extends PingPong {
    private tic: number
    private count = 0

    constructor(state: string) {
        super(state)
        this.tic = Date.now()
    }

    async handleMessage(sender: Actor, message: Message) {
        super.handleMessage(sender, message)
        this.count++
        let toc = Date.now()
        let delta = toc - this.tic
        if (delta >= 1000) {
            let avg_throughput = this.count / delta
            console.log(`\n${this.name} Events ${avg_throughput} per ms`);
            this.count = 0
            this.tic = Date.now()
        }
    }
}

const avgPing = new ThroughputPerSecond('C1')

// Add actors and watch throughput increase linearly.
for (let i = 1; i <= 8; i++) {
    const actor = new PingPong(`P${i}`)
    actor.subscribe(avgPing)
    avgPing.subscribe(actor)
    actor.broadcast('Ping')
}
