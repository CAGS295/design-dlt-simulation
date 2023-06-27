import { Subject, observeOn, asyncScheduler } from 'rxjs'

type Message = 'Ping' | 'Pong'
type Destination = string | 'Any'

interface IActor<Message> {
  readonly eventBus: Subject<{ sender: IActor<Message>, destination: Destination, message: Message }>
  readonly name: string
  eventId: number
  handleMessage: (sender: IActor<Message>, message: Message) => Promise<void>
  broadcast: (message: Message, destination: Destination) => void
  subscribe: (actor: IActor<Message>, self: IActor<Message>) => void
}

class Actor<M> implements IActor<M> {
  readonly name: string
  readonly eventBus: Subject<{ sender: IActor<M>, destination: Destination, message: M }>
  eventId: number = 0

  constructor(name: string) {
    this.name = name
    this.eventBus = new Subject<{ sender: IActor<M>, message: M, destination: Destination }>()
  }

  async handleMessage(sender: IActor<M>, message: M) {
    this.eventId++
    process.stdout.write(`\r${this.name} ${this.eventId}: ${sender.name} ${message}`)
  }

  broadcast(message: M, destination = 'Any'): void {
    this.eventBus.next({ sender: this, message, destination })
  }

  subscribe(actor: IActor<M>, self: IActor<M> = this): void {
    actor.eventBus
      .pipe(observeOn(asyncScheduler))
      .subscribe(async ({ sender, message, destination }) => {
        if (destination === 'Any' || this.name === destination) {
          await self.handleMessage(sender, message)
        }
      })
  }
}

class PingPong extends Actor<Message> {
  async handleMessage(sender: IActor<Message>, message: Message) {
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

class ThroughputPerSecond<T extends IActor<Message>> implements IActor<Message> {
  eventBus: Subject<{ sender: IActor<Message>, destination: Destination, message: Message }>
  name: string
  eventId: number
  private tic: number
  private count = 0
  private readonly t: T

  constructor(innerActor: T) {
    this.eventBus = innerActor.eventBus
    this.name = innerActor.name
    this.eventId = innerActor.eventId
    this.t = innerActor
    this.tic = Date.now()
  }

  broadcast(message: Message, destination: string): void {
    this.t.broadcast(message, destination)
  }

  subscribe(actor: IActor<Message>, self: IActor<Message> = this): void {
    this.t.subscribe(actor, self)
  }

  async handleMessage(sender: IActor<Message>, message: Message) {
    this.t.handleMessage(sender, message)
    this.count++
    const toc = Date.now()
    const delta = toc - this.tic
    if (delta >= 1000) {
      const avgThroughput = this.count / delta
      console.log(`\n${this.name} Events ${avg_throughput} per ms`)
      this.count = 0
      this.tic = Date.now()
    }
  }
}

const avgPing = new ThroughputPerSecond(new PingPong('C1'))

// Add actors and watch throughput increase linearly.
for (let i = 1; i <= 8; i++) {
  const actor = new PingPong(`P${i}`)
  actor.subscribe(avgPing)
  avgPing.subscribe(actor)
  actor.broadcast('Ping')
}
