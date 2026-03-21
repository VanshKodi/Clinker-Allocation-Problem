import numpy as np
import asyncio
from db import supabase


class GeneticAlgorithm:

    def __init__(self, params: dict):
        self.preset   = params["preset"]
        self.pop_size = params.get("pop_size", 60)
        self.gens     = params.get("generations", 150)
        self.elite    = params.get("elite_size", 5)
        self.lam      = params.get("penalty_lambda", 1e6)

        sel = params.get("selection", {})
        self.sel_method = sel.get("method", "tournament")
        if self.sel_method == "tournament":
            self.tourn_size = sel.get("tournament_size", 3)

        cx = params.get("crossover", {})
        self.cx_method = cx.get("method", "uniform")
        if self.cx_method == "uniform":
            self.cx_rate = cx.get("rate", 0.8)

        mut = params.get("mutation", {})
        self.mut_method = mut.get("method", "gaussian")
        if self.mut_method == "gaussian":
            self.mut_rate  = mut.get("rate", 0.15)
            self.mut_sigma = mut.get("sigma", 50.0)

    # ── Data ────────────────────────────────────────────────

    def load_data(self):
        prod_units  = supabase.table("production_units").select("*").eq("preset", self.preset).execute().data
        grind_units = supabase.table("grinding_units").select("*").eq("preset", self.preset).execute().data
        routes      = supabase.table("routes").select("*").eq("preset", self.preset).execute().data

        self.prod_units  = prod_units
        self.grind_units = grind_units
        self.routes      = routes
        self.n_routes    = len(routes)

        self.capacity = {pu["id"]: pu["capacity"] for pu in prod_units}
        self.demand   = {gu["id"]: gu["demand"]   for gu in grind_units}

        self.routes_from = {pu["id"]: [] for pu in prod_units}
        self.routes_to   = {gu["id"]: [] for gu in grind_units}
        for idx, r in enumerate(routes):
            self.routes_from[r["pu_id"]].append(idx)
            self.routes_to[r["gu_id"]].append(idx)

        self.cost_arr   = np.array([r["cost_per_tonne"]  for r in routes], dtype=float)
        self.fixed_arr  = np.array([r["fixed_trip_cost"] for r in routes], dtype=float)
        self.maxcap_arr = np.array([r["max_capacity"] if r["max_capacity"] else np.inf for r in routes], dtype=float)

    # ── Chromosome ──────────────────────────────────────────

    def random_chromosome(self):
        chrom = np.zeros(self.n_routes)
        remaining_demand = self.demand.copy()

        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            available = self.capacity[pu_id]
            # only routes where destination still has unmet demand
            active_idxs = [i for i in idxs if remaining_demand.get(self.routes[i]["gu_id"], 0) > 0]
            if not active_idxs:
                continue

            demands = np.array([remaining_demand[self.routes[i]["gu_id"]] for i in active_idxs])
            weights = demands / demands.sum()
            # dirichlet gives varied splits, not uniform
            split = np.random.dirichlet(weights * 5 + 1)
            alloc = split * min(available, demands.sum())
            # respect max capacity per route
            for j, i in enumerate(active_idxs):
                alloc[j] = min(alloc[j], self.maxcap_arr[i])
            alloc = np.minimum(alloc, demands)
            for j, i in enumerate(active_idxs):
                chrom[i] = alloc[j]
                remaining_demand[self.routes[i]["gu_id"]] -= alloc[j]

        return chrom

    # ── Fitness ─────────────────────────────────────────────

    def fitness(self, chrom):
        chrom = np.clip(chrom, 0, None)

        # variable transport cost
        transport_cost = np.sum(chrom * self.cost_arr)

        # fixed trip cost — charged if route is used (qty > threshold)
        active = chrom > 1.0
        fixed_cost = np.sum(self.fixed_arr[active])

        # supply violation — per prod unit
        supply_viol = 0.0
        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            used = sum(chrom[i] for i in idxs)
            supply_viol += max(0.0, used - self.capacity[pu_id]) ** 2

        # demand violation — per grind unit
        demand_viol = 0.0
        for gu_id, idxs in self.routes_to.items():
            if not idxs:
                continue
            received = sum(chrom[i] for i in idxs)
            demand_viol += max(0.0, self.demand[gu_id] - received) ** 2

        # max capacity violation — per route
        cap_viol = np.sum(np.maximum(chrom - self.maxcap_arr, 0) ** 2)

        penalty = self.lam * (supply_viol + demand_viol + cap_viol)
        return transport_cost + fixed_cost + penalty

    # ── Selection ───────────────────────────────────────────

    def select(self, pop, fits):
        if self.sel_method == "tournament":
            return self._tournament(pop, fits)

    def _tournament(self, pop, fits):
        idxs = np.random.choice(len(pop), self.tourn_size, replace=False)
        best = min(idxs, key=lambda i: fits[i])
        return pop[best].copy()

    # ── Crossover ───────────────────────────────────────────

    def crossover(self, p1, p2):
        if self.cx_method == "uniform":
            return self._uniform_cx(p1, p2)

    def _uniform_cx(self, p1, p2):
        if np.random.rand() > self.cx_rate:
            return p1.copy(), p2.copy()
        mask = np.random.rand(self.n_routes) < 0.5
        c1 = np.where(mask, p1, p2)
        c2 = np.where(mask, p2, p1)
        return c1, c2

    # ── Mutation ────────────────────────────────────────────

    def mutate(self, chrom):
        if self.mut_method == "gaussian":
            return self._gaussian_mut(chrom)

    def _gaussian_mut(self, chrom):
        chrom = chrom.copy()
        mask  = np.random.rand(self.n_routes) < self.mut_rate
        noise = np.random.normal(0, self.mut_sigma, self.n_routes)
        chrom[mask] += noise[mask]
        return np.clip(chrom, 0, None)

    # ── Repair ──────────────────────────────────────────────

    def repair(self, chrom):
        # scale down any prod unit exceeding its capacity
        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            used = sum(chrom[i] for i in idxs)
            if used > self.capacity[pu_id] and used > 0:
                scale = self.capacity[pu_id] / used
                for i in idxs:
                    chrom[i] *= scale
        # clip to route max capacity
        chrom = np.minimum(chrom, self.maxcap_arr)
        return chrom

    # ── Result builder ──────────────────────────────────────

    def build_result(self, best_chrom, best_fit, history):
        allocations = []
        for idx, route in enumerate(self.routes):
            qty = float(best_chrom[idx])
            if qty > 1.0:
                allocations.append({
                    "route_id":   route["id"],
                    "route_name": route["name"],
                    "pu_id":      route["pu_id"],
                    "gu_id":      route["gu_id"],
                    "tonnes":     round(qty, 2),
                    "cost":       round(qty * route["cost_per_tonne"] + (route["fixed_trip_cost"] if qty > 1.0 else 0), 2),
                })

        total_cost = sum(a["cost"] for a in allocations)

        return {
            "done":         True,
            "total_cost":   round(total_cost, 2),
            "best_fitness": round(best_fit, 2),
            "allocations":  allocations,
            "history":      history,
            "preset":       self.preset,
        }

    # ── Run (async generator) ────────────────────────────────

    async def run(self):
        self.load_data()

        pop  = [self.random_chromosome() for _ in range(self.pop_size)]
        fits = [self.fitness(c) for c in pop]

        best_chrom = pop[int(np.argmin(fits))].copy()
        best_fit   = min(fits)
        history    = []

        for gen in range(self.gens):
            # elitism
            sorted_idx = np.argsort(fits)
            new_pop = [pop[i].copy() for i in sorted_idx[:self.elite]]

            # fill rest of population
            while len(new_pop) < self.pop_size:
                p1 = self.select(pop, fits)
                p2 = self.select(pop, fits)
                c1, c2 = self.crossover(p1, p2)
                c1 = self.repair(self.mutate(c1))
                c2 = self.repair(self.mutate(c2))
                new_pop.extend([c1, c2])

            pop  = new_pop[:self.pop_size]
            fits = [self.fitness(c) for c in pop]

            gen_best_idx = int(np.argmin(fits))
            gen_best_fit = fits[gen_best_idx]
            gen_avg_fit  = float(np.mean(fits))

            if gen_best_fit < best_fit:
                best_fit   = gen_best_fit
                best_chrom = pop[gen_best_idx].copy()

            entry = {
                "generation":    gen + 1,
                "best_fitness":  round(gen_best_fit, 2),
                "avg_fitness":   round(gen_avg_fit, 2),
                "worst_fitness": round(max(fits), 2),
            }
            history.append(entry)

            # yield progress every generation
            yield {"type": "progress", **entry}

            # hand control back to event loop so SSE can flush
            await asyncio.sleep(0)

        # final result
        yield {"type": "result", **self.build_result(best_chrom, best_fit, history)}