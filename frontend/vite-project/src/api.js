const BASE = "http://localhost:8000"

export const api = {
  getPresets:      () => fetch(`${BASE}/data/presets/summary`).then(r => r.json()),
  getProdUnits:    (preset) => fetch(`${BASE}/data/prod-units?preset=${encodeURIComponent(preset)}`).then(r => r.json()),
  getGrindUnits:   (preset) => fetch(`${BASE}/data/grind-units?preset=${encodeURIComponent(preset)}`).then(r => r.json()),
  getRoutes:       (preset) => fetch(`${BASE}/data/routes?preset=${encodeURIComponent(preset)}`).then(r => r.json()),

  createProdUnit:  (body) => fetch(`${BASE}/data/prod-units`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  updateProdUnit:  (id, body) => fetch(`${BASE}/data/prod-units/${encodeURIComponent(id)}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  deleteProdUnit:  (id) => fetch(`${BASE}/data/prod-units/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => r.json()),

  createGrindUnit: (body) => fetch(`${BASE}/data/grind-units`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  updateGrindUnit: (id, body) => fetch(`${BASE}/data/grind-units/${encodeURIComponent(id)}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  deleteGrindUnit: (id) => fetch(`${BASE}/data/grind-units/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => r.json()),

  createRoute:     (body) => fetch(`${BASE}/data/routes`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  updateRoute:     (id, body) => fetch(`${BASE}/data/routes/${encodeURIComponent(id)}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  deleteRoute:     (id) => fetch(`${BASE}/data/routes/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => r.json()),

  getResults:      () => fetch(`${BASE}/results`).then(r => r.json()),
  getResult:       (id) => fetch(`${BASE}/results/${encodeURIComponent(id)}`).then(r => r.json()),
  saveResult:      (body) => fetch(`${BASE}/results/save`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).then(r => r.json()),
  deleteResult:    (id) => fetch(`${BASE}/results/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => r.json()),

  runGA: (params) => fetch(`${BASE}/ga/run`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(params) }),
}
