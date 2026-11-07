/** One transactional transition at a time. A superseded request may finish caching but cannot enter play. */
export class WorldAssetGate {
  private generation = 0;
  constructor(
    private readonly ready: (world: string) => boolean,
    private readonly load: (world: string) => Promise<void>,
  ) {}
  cancel(): void {
    this.generation++;
  }
  enter(
    world: string,
    commit: () => void,
    ui: {
      loading: () => void;
      done: () => void;
      failed: (error: unknown, retry: () => void) => void;
    },
  ): void {
    const ticket = ++this.generation;
    if (this.ready(world)) {
      ui.done();
      commit();
      return;
    }
    ui.loading();
    void this.load(world)
      .then(() => {
        if (ticket !== this.generation) return;
        ui.done();
        commit();
      })
      .catch((error: unknown) => {
        if (ticket !== this.generation) return;
        ui.failed(error, () => {
          if (ticket === this.generation) this.enter(world, commit, ui);
        });
      });
  }
}
