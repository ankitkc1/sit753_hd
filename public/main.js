(() => {
  const canvas = document.getElementById("semanticCanvas");
  const wrap = document.querySelector(".board-canvas-wrap");
  const cards = Array.from(document.querySelectorAll(".ctx-card"));
  const liveStatus = document.getElementById("liveStatus");
  const focusTag = document.getElementById("focusTag");
  const terminalText = document.getElementById("terminalText");

  if (!canvas || !wrap || cards.length === 0) return;

  const ctx = canvas.getContext("2d");

  // Node state
  let nodes = [];
  let hoveredNode = "system";
  let mouse = { x: -9999, y: -9999 };
  let offset = { x: 0, y: 0 };

  const defaultMessages = {
    system: "The landing page of Ankit Protfolio Site.",
    persona: "Include picture, description, CV and background.",
    reasoning: "My thoughts, ideas, and writings on various topics.",
    tools: "showcasing my work, tech stacks, and built systems.",
    retrieval: "publications, DOI, abstracts and experiments.",
    knowledge: "publications, papers, and references.",
    response: "to get in touch."
  };

  const roleByNode = {
    system: "system",
    persona: "persona",
    reasoning: "reasoning",
    tools: "tools",
    retrieval: "retrieval",
    knowledge: "knowledge",
    response: "response"
  };

  const edges = [
    ["system", "persona"],
    ["system", "tools"],
    ["system", "knowledge"],
    ["persona", "tools"],
    ["persona", "response"],
    ["reasoning", "tools"],
    ["reasoning", "knowledge"],
    ["tools", "retrieval"],
    ["tools", "response"],
    ["retrieval", "knowledge"],
    ["knowledge", "response"],
    ["reasoning", "retrieval"]
  ];

  function resizeCanvas() {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    measureNodes();
  }

  function measureNodes() {
    const wrapRect = wrap.getBoundingClientRect();

    nodes = cards.map((card) => {
      const r = card.getBoundingClientRect();
      const node = card.dataset.node;

      return {
        id: node,
        x: r.left - wrapRect.left + r.width / 2,
        y: r.top - wrapRect.top + r.height / 2,
        w: r.width,
        h: r.height
      };
    });
  }

  function findNode(id) {
    return nodes.find((n) => n.id === id);
  }

  function parseLinks(card) {
    return (card.dataset.links || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function setFocus(card) {
    cards.forEach((c) => {
      c.classList.remove("is-active", "is-dim");
    });

    if (!card) return;

    hoveredNode = card.dataset.node;

    const links = new Set(parseLinks(card));
    links.add(hoveredNode);

    cards.forEach((c) => {
      const id = c.dataset.node;
      if (links.has(id)) {
        c.classList.add("is-active");
      } else {
        c.classList.add("is-dim");
      }
    });

    const stop = card.dataset.stop || "Home";
    const role = card.dataset.role || "";
    liveStatus.textContent = `${role} loaded`;
    focusTag.textContent = roleByNode[hoveredNode] || hoveredNode;
    terminalText.textContent = `${stop}: ${defaultMessages[hoveredNode] || "Node selected."}`;
  }

  function clearFocusToCurrent() {
    const current = document.querySelector(".ctx-card.is-current") || cards[0];
    setFocus(current);
  }

  function draw() {
    const rect = wrap.getBoundingClientRect();

    // Gentle mouse-reactive offset (subtle, premium, not flashy)
    const tx = (mouse.x - rect.width / 2) * 0.01;
    const ty = (mouse.y - rect.height / 2) * 0.01;
    offset.x += (tx - offset.x) * 0.06;
    offset.y += (ty - offset.y) * 0.06;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background semantic dots (very light)
    drawFieldDots(rect.width, rect.height);

    // Draw edges
    for (const [a, b] of edges) {
      const n1 = findNode(a);
      const n2 = findNode(b);
      if (!n1 || !n2) continue;

      const isActiveEdge = isEdgeActive(a, b, hoveredNode);

      ctx.beginPath();
      ctx.moveTo(n1.x + offset.x, n1.y + offset.y);
      ctx.lineTo(n2.x + offset.x, n2.y + offset.y);
      ctx.lineWidth = isActiveEdge ? 1.25 : 1;
      ctx.strokeStyle = isActiveEdge ? "rgba(15,15,16,0.55)" : "rgba(15,15,16,0.14)";
      ctx.stroke();
    }

    // Draw nodes
    nodes.forEach((n) => {
      const isActive = n.id === hoveredNode || isConnectedToHovered(n.id, hoveredNode);
      const radius = n.id === hoveredNode ? 5 : 4;

      // dot
      ctx.beginPath();
      ctx.arc(n.x + offset.x, n.y + offset.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "rgba(15,15,16,0.95)" : "rgba(15,15,16,0.35)";
      ctx.fill();

      // outer ring for hovered node
      if (n.id === hoveredNode) {
        ctx.beginPath();
        ctx.arc(n.x + offset.x, n.y + offset.y, 9, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(15,15,16,0.35)";
        ctx.stroke();
      }
    });

    requestAnimationFrame(draw);
  }

  function drawFieldDots(width, height) {
    const spacing = 46;
    const jitter = 0.6;

    for (let y = 20; y < height; y += spacing) {
      for (let x = 20; x < width; x += spacing) {
        const dx = ((x * 31 + y * 17) % 9) * jitter;
        const dy = ((x * 13 + y * 29) % 7) * jitter;

        ctx.beginPath();
        ctx.arc(x + dx + offset.x * 0.15, y + dy + offset.y * 0.15, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15,15,16,0.08)";
        ctx.fill();
      }
    }
  }

  function isConnectedToHovered(nodeId, hovered) {
    return edges.some(([a, b]) => {
      return (a === hovered && b === nodeId) || (b === hovered && a === nodeId);
    });
  }

  function isEdgeActive(a, b, hovered) {
    return a === hovered || b === hovered;
  }

  // Card interactions
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => setFocus(card));
    card.addEventListener("focus", () => setFocus(card));
    card.addEventListener("mouseleave", clearFocusToCurrent);
    card.addEventListener("blur", clearFocusToCurrent);
  });

  // Keyboard arrow navigation
  document.getElementById("contextCards")?.addEventListener("keydown", (e) => {
    const activeEl = document.activeElement;
    if (!activeEl || !activeEl.classList.contains("ctx-card")) return;

    const currentIndex = cards.indexOf(activeEl);
    if (currentIndex === -1) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = cards[Math.min(currentIndex + 1, cards.length - 1)];
      next.focus();
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = cards[Math.max(currentIndex - 1, 0)];
      prev.focus();
    }
  });

  // Track mouse for subtle canvas response
  wrap.addEventListener("mousemove", (e) => {
    const r = wrap.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });

  wrap.addEventListener("mouseleave", () => {
    mouse.x = wrap.clientWidth / 2;
    mouse.y = wrap.clientHeight / 2;
  });

  // Initial current page support
  const page = (document.body.dataset.page || "home").toLowerCase();
  const current =
    cards.find((c) => (c.dataset.stop || "").toLowerCase() === page) ||
    document.querySelector(".ctx-card.is-current") ||
    cards[0];

  if (current) {
    cards.forEach((c) => c.classList.remove("is-current"));
    current.classList.add("is-current");
    setFocus(current);
  }

  // Resize handling
  const ro = new ResizeObserver(() => {
    resizeCanvas();
  });
  ro.observe(wrap);

  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  requestAnimationFrame(draw);
})();