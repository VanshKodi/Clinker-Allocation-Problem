import numpy as np
import asyncio
import time
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
        elif self.sel_method not in ("roulette", "rank", "uniform"):
            raise ValueError(f"Unknown selection method: {self.sel_method}")

        cx = params.get("crossover", {})
        self.cx_method = cx.get("method", "uniform")
        if self.cx_method in ("uniform", "single_point", "two_point", "hux"):
            self.cx_rate = cx.get("rate", 0.8)
        else:
            raise ValueError(f"Unknown crossover method: {self.cx_method}")

        mut = params.get("mutation", {})
        self.mut_method = mut.get("method", "gaussian")
        if self.mut_method == "gaussian":
            self.mut_rate  = mut.get("rate", 0.15)
            self.mut_sigma = mut.get("sigma", 50.0)
        elif self.mut_method == "uniform":
            self.mut_rate  = mut.get("rate", 0.15)
            self.mut_range = mut.get("range", 100.0)
        elif self.mut_method in ("swap", "scramble"):
            self.mut_rate = mut.get("rate", 0.15)
        else:
            raise ValueError(f"Unknown mutation method: {self.mut_method}")

        # Validation
        if self.pop_size < 2:
            raise ValueError("pop_size must be at least 2")
        if self.pop_size < self.elite:
            raise ValueError("pop_size must be >= elite_size")
        if self.gens < 1:
            raise ValueError("generations must be at least 1")

    # ── Data ────────────────────────────────────────────────

    def load_data(self):
        prod_units  = supabase.table("production_units").select("*").eq("preset", self.preset).execute().data
        grind_units = supabase.table("grinding_units").select("*").eq("preset", self.preset).execute().data
        routes      = supabase.table("routes").select("*").eq("preset", self.preset).execute().data

        if not prod_units:
            raise ValueError(f"No production units found for preset '{self.preset}'")
        if not grind_units:
            raise ValueError(f"No grinding units found for preset '{self.preset}'")
        if not routes:
            raise ValueError(f"No routes found for preset '{self.preset}'")

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
            active_idxs = [i for i in idxs if remaining_demand.get(self.routes[i]["gu_id"], 0) > 0]
            if not active_idxs:
                continue

            demands = np.array([remaining_demand[self.routes[i]["gu_id"]] for i in active_idxs])
            weights = demands / demands.sum()
            split = np.random.dirichlet(weights * 5 + 1)
            alloc = split * min(available, demands.sum())
            for j, i in enumerate(active_idxs):
                alloc[j] = min(alloc[j], self.maxcap_arr[i])
            alloc = np.minimum(alloc, demands)
            for j, i in enumerate(active_idxs):
                chrom[i] = alloc[j]
                remaining_demand[self.routes[i]["gu_id"]] -= alloc[j]

        return np.clip(chrom, 0, None)

    # ── Fitness ─────────────────────────────────────────────

    def fitness(self, chrom):
        chrom = np.clip(chrom, 0, None)

        transport_cost = float(np.sum(chrom * self.cost_arr))

        active = chrom > 1.0
        fixed_cost = float(np.sum(self.fixed_arr[active]))

        supply_viol = 0.0
        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            used = sum(chrom[i] for i in idxs)
            supply_viol += max(0.0, used - self.capacity[pu_id]) ** 2

        demand_viol = 0.0
        for gu_id, idxs in self.routes_to.items():
            if not idxs:
                continue
            received = sum(chrom[i] for i in idxs)
            demand_viol += max(0.0, self.demand[gu_id] - received) ** 2

        cap_viol = float(np.sum(np.maximum(chrom - self.maxcap_arr, 0) ** 2))

        penalty = self.lam * (supply_viol + demand_viol + cap_viol)
        return transport_cost + fixed_cost + penalty

    def fitness_breakdown(self, chrom):
        chrom = np.clip(chrom, 0, None)

        transport_cost = float(np.sum(chrom * self.cost_arr))

        active = chrom > 1.0
        fixed_cost = float(np.sum(self.fixed_arr[active]))

        supply_viol = 0.0
        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            used = sum(chrom[i] for i in idxs)
            supply_viol += max(0.0, used - self.capacity[pu_id]) ** 2

        demand_viol = 0.0
        for gu_id, idxs in self.routes_to.items():
            if not idxs:
                continue
            received = sum(chrom[i] for i in idxs)
            demand_viol += max(0.0, self.demand[gu_id] - received) ** 2

        cap_viol = float(np.sum(np.maximum(chrom - self.maxcap_arr, 0) ** 2))

        total = transport_cost + fixed_cost + self.lam * (supply_viol + demand_viol + cap_viol)

        return {
            "transport_cost":   round(transport_cost, 2),
            "fixed_cost":       round(fixed_cost, 2),
            "supply_violation": round(supply_viol, 2),
            "demand_violation": round(demand_viol, 2),
            "cap_violation":    round(cap_viol, 2),
            "total":            round(total, 2),
        }

    # ── Selection ───────────────────────────────────────────

    def select(self, pop, fits):
        if self.sel_method == "tournament":
            return self._tournament(pop, fits)
        elif self.sel_method == "roulette":
            return self._roulette(pop, fits)
        elif self.sel_method == "rank":
            return self._rank(pop, fits)
        elif self.sel_method == "uniform":
            return self._uniform_selection(pop, fits)

    def _tournament(self, pop, fits):
        idxs = np.random.choice(len(pop), self.tourn_size, replace=False)
        best = min(idxs, key=lambda i: fits[i])
        return pop[best].copy()

    def _roulette(self, pop, fits):
        fits_arr = np.array(fits)
        # Invert fitness (lower is better) so higher inverted value = more likely
        max_fit = fits_arr.max()
        inverted = max_fit - fits_arr + 1e-8
        probs = inverted / inverted.sum()
        idx = np.random.choice(len(pop), p=probs)
        return pop[idx].copy()

    def _rank(self, pop, fits):
        n = len(pop)
        # Rank: worst fitness gets rank 1, best gets rank N
        order = np.argsort(fits)[::-1]  # indices sorted worst-first
        ranks = np.zeros(n)
        for rank_val, idx in enumerate(order, start=1):
            ranks[idx] = rank_val
        probs = ranks / ranks.sum()
        idx = np.random.choice(n, p=probs)
        return pop[idx].copy()

    def _uniform_selection(self, pop, fits):
        idx = np.random.randint(len(pop))
        return pop[idx].copy()

    # ── Crossover ───────────────────────────────────────────

    def crossover(self, p1, p2):
        if self.cx_method == "uniform":
            return self._uniform_cx(p1, p2)
        elif self.cx_method == "single_point":
            return self._single_point_cx(p1, p2)
        elif self.cx_method == "two_point":
            return self._two_point_cx(p1, p2)
        elif self.cx_method == "hux":
            return self._hux_cx(p1, p2)

    def _uniform_cx(self, p1, p2):
        if np.random.rand() > self.cx_rate:
            return p1.copy(), p2.copy()
        mask = np.random.rand(self.n_routes) < 0.5
        c1 = np.where(mask, p1, p2)
        c2 = np.where(mask, p2, p1)
        return c1, c2

    def _single_point_cx(self, p1, p2):
        if np.random.rand() > self.cx_rate:
            return p1.copy(), p2.copy()
        pt = np.random.randint(1, self.n_routes)
        c1 = np.concatenate([p1[:pt], p2[pt:]])
        c2 = np.concatenate([p2[:pt], p1[pt:]])
        return c1, c2

    def _two_point_cx(self, p1, p2):
        if np.random.rand() > self.cx_rate:
            return p1.copy(), p2.copy()
        pts = sorted(np.random.choice(self.n_routes, 2, replace=False))
        a, b = pts[0], pts[1]
        c1 = p1.copy()
        c2 = p2.copy()
        c1[a:b] = p2[a:b]
        c2[a:b] = p1[a:b]
        return c1, c2

    def _hux_cx(self, p1, p2):
        if np.random.rand() > self.cx_rate:
            return p1.copy(), p2.copy()
        diff_indices = np.where(p1 != p2)[0]
        if len(diff_indices) == 0:
            return p1.copy(), p2.copy()
        n_swap = len(diff_indices) // 2
        swap_indices = np.random.choice(diff_indices, size=n_swap, replace=False)
        c1 = p1.copy()
        c2 = p2.copy()
        c1[swap_indices] = p2[swap_indices]
        c2[swap_indices] = p1[swap_indices]
        return c1, c2

    # ── Mutation ────────────────────────────────────────────

    def mutate(self, chrom):
        if self.mut_method == "gaussian":
            return self._gaussian_mut(chrom)
        elif self.mut_method == "uniform":
            return self._uniform_mut(chrom)
        elif self.mut_method == "swap":
            return self._swap_mut(chrom)
        elif self.mut_method == "scramble":
            return self._scramble_mut(chrom)

    def _gaussian_mut(self, chrom):
        chrom = chrom.copy()
        mask  = np.random.rand(self.n_routes) < self.mut_rate
        noise = np.random.normal(0, self.mut_sigma, self.n_routes)
        chrom[mask] += noise[mask]
        return np.clip(chrom, 0, None)

    def _uniform_mut(self, chrom):
        chrom = chrom.copy()
        mask = np.random.rand(self.n_routes) < self.mut_rate
        chrom[mask] = np.random.uniform(0, self.mut_range, mask.sum())
        return chrom

    def _swap_mut(self, chrom):
        chrom = chrom.copy()
        if self.n_routes < 2 or np.random.rand() >= self.mut_rate:
            return chrom
        i, j = np.random.choice(self.n_routes, 2, replace=False)
        chrom[i], chrom[j] = chrom[j], chrom[i]
        return chrom

    def _scramble_mut(self, chrom):
        chrom = chrom.copy()
        mask = np.random.rand(self.n_routes) < self.mut_rate
        indices = np.where(mask)[0]
        if len(indices) > 1:
            values = chrom[indices].copy()
            np.random.shuffle(values)
            chrom[indices] = values
        return chrom

    # ── Repair ──────────────────────────────────────────────

    def repair(self, chrom):
        chrom = np.clip(chrom, 0, None)
        for pu_id, idxs in self.routes_from.items():
            if not idxs:
                continue
            used = sum(chrom[i] for i in idxs)
            if used > self.capacity[pu_id] and used > 0:
                scale = self.capacity[pu_id] / used
                for i in idxs:
                    chrom[i] *= scale
        chrom = np.minimum(chrom, self.maxcap_arr)
        chrom = np.clip(chrom, 0, None)
        return chrom

    # ── Result builder ──────────────────────────────────────

    def build_result(self, best_chrom, best_fit, history, elapsed_seconds, convergence_generation):
        pu_lookup = {pu["id"]: pu for pu in self.prod_units}
        gu_lookup = {gu["id"]: gu for gu in self.grind_units}

        allocations = []
        for idx, route in enumerate(self.routes):
            qty = float(best_chrom[idx])
            if qty > 1.0:
                pu = pu_lookup[route["pu_id"]]
                gu = gu_lookup[route["gu_id"]]
                variable_cost = round(qty * route["cost_per_tonne"], 2)
                fixed_cost = round(route["fixed_trip_cost"], 2)
                allocations.append({
                    "route_id":      route["id"],
                    "route_name":    route["name"],
                    "pu_id":         route["pu_id"],
                    "gu_id":         route["gu_id"],
                    "pu_name":       pu["name"],
                    "gu_name":       gu["name"],
                    "pu_city":       pu["city"],
                    "gu_city":       gu["city"],
                    "tonnes":        round(qty, 2),
                    "variable_cost": variable_cost,
                    "fixed_cost":    fixed_cost,
                    "total_cost":    round(variable_cost + fixed_cost, 2),
                })

        total_cost = sum(a["total_cost"] for a in allocations)

        return {
            "done":                    True,
            "preset":                  self.preset,
            "total_cost":              round(total_cost, 2),
            "best_fitness":            round(best_fit, 2),
            "elapsed_seconds":         round(elapsed_seconds, 3),
            "convergence_generation":  convergence_generation,
            "allocations":             allocations,
            "history":                 history,
        }

    # ── Run (async generator) ────────────────────────────────

    async def run(self):
        self.load_data()

        t_start = time.time()

        pop  = [self.random_chromosome() for _ in range(self.pop_size)]
        fits = [self.fitness(c) for c in pop]

        best_chrom = pop[int(np.argmin(fits))].copy()
        best_fit   = min(fits)
        history    = []
        convergence_generation = 0

        for gen in range(self.gens):
            sorted_idx = np.argsort(fits)
            new_pop = [pop[i].copy() for i in sorted_idx[:self.elite]]

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
            gen_worst    = float(max(fits))
            elapsed      = time.time() - t_start

            if gen_best_fit < best_fit:
                best_fit   = gen_best_fit
                best_chrom = pop[gen_best_idx].copy()
                convergence_generation = gen + 1

            breakdown = self.fitness_breakdown(best_chrom)

            entry = {
                "generation":    gen + 1,
                "best_fitness":  round(gen_best_fit, 2),
                "avg_fitness":   round(gen_avg_fit, 2),
                "worst_fitness": round(gen_worst, 2),
            }
            history.append(entry)

            yield {
                "type":            "progress",
                "generation":      gen + 1,
                "total":           self.gens,
                "best_fitness":    round(best_fit, 2),
                "avg_fitness":     round(gen_avg_fit, 2),
                "worst_fitness":   round(gen_worst, 2),
                "elapsed_seconds": round(elapsed, 3),
                "breakdown":       breakdown,
            }

            await asyncio.sleep(0)

        elapsed = time.time() - t_start
        result = self.build_result(best_chrom, best_fit, history, elapsed, convergence_generation)
        yield {"type": "result", **result}