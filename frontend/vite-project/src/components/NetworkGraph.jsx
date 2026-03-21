import { useRef, useEffect, useState, useCallback } from 'react'

const PU_COLOR = '#fbbf24'
const GU_COLOR = '#a78bfa'
const EDGE_COLOR = 'rgba(148,163,184,0.25)'
const LABEL_COLOR = '#e2e8f0'
const NODE_RADIUS = 10

export default function NetworkGraph({ prodUnits, grindUnits, routes }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const initGraph = useCallback(() => {
    if (!prodUnits.length && !grindUnits.length) return
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.parentElement.clientWidth
    const H = canvas.parentElement.clientHeight
    canvas.width = W * devicePixelRatio
    canvas.height = H * devicePixelRatio
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'

    const nodes = []
    const nodeMap = {}
    prodUnits.forEach((pu, i) => {
      const n = { id: pu.id, label: pu.name, city: pu.city, type: 'pu', capacity: pu.capacity, description: pu.description, x: W * 0.25 + Math.random() * W * 0.1, y: (H / (prodUnits.length + 1)) * (i + 1), vx: 0, vy: 0, pinned: false }
      nodes.push(n)
      nodeMap[pu.id] = n
    })
    grindUnits.forEach((gu, i) => {
      const n = { id: gu.id, label: gu.name, city: gu.city, type: 'gu', demand: gu.demand, description: gu.description, x: W * 0.75 + Math.random() * W * 0.1, y: (H / (grindUnits.length + 1)) * (i + 1), vx: 0, vy: 0, pinned: false }
      nodes.push(n)
      nodeMap[gu.id] = n
    })

    const maxCap = Math.max(...routes.map(r => r.max_capacity || 1), 1)
    const edges = routes.map(r => ({
      source: nodeMap[r.pu_id],
      target: nodeMap[r.gu_id],
      route: r,
      width: Math.max(1, (r.max_capacity || 1) / maxCap * 5),
      springK: 1 / Math.max(r.cost_per_tonne, 0.1),
    })).filter(e => e.source && e.target)

    nodesRef.current = nodes
    edgesRef.current = edges
  }, [prodUnits, grindUnits, routes])

  useEffect(() => {
    initGraph()
  }, [initGraph])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true
    let settled = 0

    const REPULSION = 8000
    const SPRING_REST = 150
    const DAMPING = 0.85
    const DT = 0.3

    function simulate() {
      const nodes = nodesRef.current
      const edges = edgesRef.current
      if (!nodes.length) { frameRef.current = requestAnimationFrame(simulate); return }

      const W = canvas.width / devicePixelRatio
      const H = canvas.height / devicePixelRatio

      for (const n of nodes) { n.fx = 0; n.fy = 0 }

      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[i].x - nodes[j].x
          let dy = nodes[i].y - nodes[j].y
          let dist = Math.sqrt(dx * dx + dy * dy) || 1
          let force = REPULSION / (dist * dist)
          let fx = (dx / dist) * force
          let fy = (dy / dist) * force
          nodes[i].fx += fx; nodes[i].fy += fy
          nodes[j].fx -= fx; nodes[j].fy -= fy
        }
      }

      // spring (edges)
      for (const e of edges) {
        let dx = e.target.x - e.source.x
        let dy = e.target.y - e.source.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 1
        let force = e.springK * (dist - SPRING_REST)
        let fx = (dx / dist) * force
        let fy = (dy / dist) * force
        e.source.fx += fx; e.source.fy += fy
        e.target.fx -= fx; e.target.fy -= fy
      }

      let totalMovement = 0
      for (const n of nodes) {
        if (n.pinned) continue
        n.vx = (n.vx + n.fx * DT) * DAMPING
        n.vy = (n.vy + n.fy * DT) * DAMPING
        n.x += n.vx * DT
        n.y += n.vy * DT
        n.x = Math.max(NODE_RADIUS, Math.min(W - NODE_RADIUS, n.x))
        n.y = Math.max(NODE_RADIUS + 10, Math.min(H - NODE_RADIUS - 16, n.y))
        totalMovement += Math.abs(n.vx) + Math.abs(n.vy)
      }

      // draw
      ctx.save()
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.clearRect(0, 0, W, H)

      for (const e of edges) {
        ctx.beginPath()
        ctx.moveTo(e.source.x, e.source.y)
        ctx.lineTo(e.target.x, e.target.y)
        ctx.strokeStyle = EDGE_COLOR
        ctx.lineWidth = e.width
        ctx.stroke()
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = n.type === 'pu' ? PU_COLOR : GU_COLOR
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.font = '11px DM Sans, sans-serif'
        ctx.fillStyle = LABEL_COLOR
        ctx.textAlign = 'center'
        ctx.fillText(n.label, n.x, n.y + NODE_RADIUS + 14)
      }

      ctx.restore()

      if (totalMovement < 0.5) settled++
      else settled = 0

      if (running) {
        if (settled < 200) {
          frameRef.current = requestAnimationFrame(simulate)
        } else {
          frameRef.current = setTimeout(() => { frameRef.current = requestAnimationFrame(simulate) }, 200)
        }
      }
    }

    frameRef.current = requestAnimationFrame(simulate)
    return () => {
      running = false
      cancelAnimationFrame(frameRef.current)
      clearTimeout(frameRef.current)
    }
  }, [prodUnits, grindUnits, routes])

  const getNodeAt = (x, y) => {
    for (const n of nodesRef.current) {
      const dx = n.x - x, dy = n.y - y
      if (dx * dx + dy * dy < NODE_RADIUS * NODE_RADIUS * 2) return n
    }
    return null
  }

  const getEdgeAt = (x, y) => {
    for (const e of edgesRef.current) {
      const dx = e.target.x - e.source.x
      const dy = e.target.y - e.source.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const t = Math.max(0, Math.min(1, ((x - e.source.x) * dx + (y - e.source.y) * dy) / (len * len)))
      const px = e.source.x + t * dx
      const py = e.source.y + t * dy
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
      if (dist < Math.max(e.width, 5) + 3) return e
    }
    return null
  }

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e)
    const node = getNodeAt(pos.x, pos.y)
    if (node) {
      dragRef.current = node
      node.pinned = true
      setTooltip(null)
    }
  }

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e)
    if (dragRef.current) {
      dragRef.current.x = pos.x
      dragRef.current.y = pos.y
      return
    }
    const node = getNodeAt(pos.x, pos.y)
    if (node) {
      const info = node.type === 'pu'
        ? `<b>${node.label}</b><br/>${node.city}<br/>Capacity: ${node.capacity}<br/>${node.description || ''}<br/><a href="https://www.google.com/maps/search/${encodeURIComponent(node.label + ' ' + node.city)}" target="_blank">View on Maps</a>`
        : `<b>${node.label}</b><br/>${node.city}<br/>Demand: ${node.demand}<br/>${node.description || ''}<br/><a href="https://www.google.com/maps/search/${encodeURIComponent(node.label + ' ' + node.city)}" target="_blank">View on Maps</a>`
      setTooltip({ x: pos.x + 15, y: pos.y - 10, html: info })
      return
    }
    const edge = getEdgeAt(pos.x, pos.y)
    if (edge) {
      const r = edge.route
      setTooltip({
        x: pos.x + 15, y: pos.y - 10,
        html: `<b>${r.name}</b><br/>Cost/tonne: ₹${r.cost_per_tonne}<br/>Fixed trip: ₹${r.fixed_trip_cost}<br/>Max cap: ${r.max_capacity || '∞'}<br/>${r.description || ''}`
      })
      return
    }
    setTooltip(null)
  }

  const handleMouseUp = () => {
    if (dragRef.current) {
      dragRef.current.pinned = false
      dragRef.current = null
    }
  }

  return (
    <div className="graph-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setTooltip(null) }}
      />
      {tooltip && (
        <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'auto' }} dangerouslySetInnerHTML={{ __html: tooltip.html }} />
      )}
    </div>
  )
}
