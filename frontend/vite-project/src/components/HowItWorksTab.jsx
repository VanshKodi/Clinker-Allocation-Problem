export default function HowItWorksTab() {
  return (
    <div className="concept-cards">
      <div className="concept-card">
        <h3>Chromosome</h3>
        <p>Each candidate solution is a chromosome — a numeric array where each gene represents the tonnes of clinker shipped along a specific route. The array length equals the total number of routes in the preset. A chromosome fully describes one possible allocation plan.</p>
      </div>

      <div className="concept-card">
        <h3>Fitness Function</h3>
        <p>Fitness measures how good a solution is. Lower is better. It combines:</p>
        <p><strong>Transport cost</strong> — sum of tonnes × cost_per_tonne across all routes.</p>
        <p><strong>Fixed trip cost</strong> — a one-time cost charged per route if that route carries more than 1 tonne (threshold approach).</p>
        <p><strong>Penalty</strong> — λ × (supply violations² + demand violations² + route capacity violations²). Penalizes solutions that break constraints.</p>
      </div>

      <div className="concept-card">
        <h3>Selection</h3>
        <p>Selection chooses parents for the next generation. Fitter individuals should be more likely to reproduce.</p>
        <div className="sub-cards">
          <div className="sub-card">
            <h4>Tournament</h4>
            <p>Pick k random individuals, select the one with the best (lowest) fitness. The parameter k controls selection pressure — higher k means stronger pressure toward the best.</p>
          </div>
          <div className="sub-card">
            <h4>Roulette Wheel</h4>
            <p>Probability of selection proportional to inverted fitness (since lower fitness = better). Fitter individuals get larger "slices" of the wheel, but even weak solutions have a small chance.</p>
          </div>
          <div className="sub-card">
            <h4>Rank</h4>
            <p>Sort population by fitness, assign ranks (worst = 1, best = N). Selection probability proportional to rank. More stable than roulette because it reduces the effect of outlier fitness values.</p>
          </div>
          <div className="sub-card">
            <h4>Uniform</h4>
            <p>Pure random selection — every individual has equal chance regardless of fitness. Serves as a baseline to compare other methods against. Maximum genetic diversity, minimum selection pressure.</p>
          </div>
        </div>
      </div>

      <div className="concept-card">
        <h3>Crossover</h3>
        <p>Crossover combines two parent chromosomes to create offspring, mixing genetic material to explore new combinations.</p>
        <div className="sub-cards">
          <div className="sub-card">
            <h4>Uniform</h4>
            <p>Each gene independently comes from either parent with 50/50 probability. Maximum mixing — every gene is a fresh coin flip.</p>
          </div>
          <div className="sub-card">
            <h4>Single Point</h4>
            <p>Pick a random cut point. Child 1 gets parent 1's genes before the cut and parent 2's after. Child 2 gets the reverse. Preserves gene order within segments.</p>
          </div>
          <div className="sub-card">
            <h4>Two Point</h4>
            <p>Two random cuts define three segments. The middle segment is swapped between parents. Preserves both ends of the chromosome, swaps the middle.</p>
          </div>
          <div className="sub-card">
            <h4>HUX (Half Uniform)</h4>
            <p>Find all genes where parents differ. Swap exactly half of those differing genes at random. Guarantees offspring are equidistant from both parents in Hamming space.</p>
          </div>
        </div>
      </div>

      <div className="concept-card">
        <h3>Mutation</h3>
        <p>Mutation introduces random changes to offspring, preventing the population from converging too early on a local optimum.</p>
        <div className="sub-cards">
          <div className="sub-card">
            <h4>Gaussian</h4>
            <p>Each gene has a probability (mut_rate) of being perturbed by noise drawn from Normal(0, sigma). Produces small, continuous changes. Sigma controls the magnitude of perturbation.</p>
          </div>
          <div className="sub-card">
            <h4>Uniform</h4>
            <p>Each gene has a probability of being replaced with a random value drawn uniformly from [0, range]. Can produce larger jumps than Gaussian.</p>
          </div>
          <div className="sub-card">
            <h4>Swap</h4>
            <p>Pick two random genes and swap their values. Total allocation stays the same, but routes exchange quantities. Good for problems where the total amount matters.</p>
          </div>
          <div className="sub-card">
            <h4>Scramble</h4>
            <p>Pick a random subset of genes and shuffle them among those positions. Redistributes existing values without adding new ones. Preserves total allocation of the subset.</p>
          </div>
        </div>
      </div>

      <div className="concept-card">
        <h3>Repair</h3>
        <p>After crossover and mutation, a chromosome may violate constraints (e.g., a production unit may be allocating more than its capacity). The repair operator fixes this:</p>
        <p>1. For each production unit, if total outgoing tonnes exceed capacity, scale down all routes from that unit proportionally.</p>
        <p>2. Clip every route gene to its max_capacity (if defined).</p>
        <p>3. Clip all values to zero (no negative allocations).</p>
        <p>Repair makes the search more efficient by converting infeasible solutions into feasible ones, rather than relying solely on penalties.</p>
      </div>

      <div className="concept-card">
        <h3>Elitism</h3>
        <p>The best N individuals from the current generation are copied directly into the next generation without any modification. This guarantees the best solution found so far is never lost. Without elitism, crossover and mutation could accidentally destroy the best solution, causing fitness to regress.</p>
      </div>
    </div>
  )
}
