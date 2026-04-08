"use strict";

(() => {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  /**
   * Initializes the copy email button functionality.
   */
  const initCopyEmail = () => {
    const copyEmailBtn = document.getElementById("copyEmail");
    if (!copyEmailBtn) return;

    copyEmailBtn.addEventListener("click", async () => {
      const email = copyEmailBtn.dataset.email || "";
      if (!email) return;

      const original = copyEmailBtn.textContent;
      try {
        await navigator.clipboard.writeText(email);
        copyEmailBtn.textContent = "Copied ✓";
      } catch {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copyEmailBtn.textContent = "Copied ✓";
      } finally {
        setTimeout(() => {
          copyEmailBtn.textContent = original;
        }, 1200);
      }
    });
  };

  /**
   * Animates a numerical counter from 0 to its target over a duration.
   * @param {HTMLElement} el The element to animate
   */
  function animateCount(el) {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    if (!Number.isFinite(target)) return;

    if (prefersReducedMotion) {
      el.textContent = `${target}${suffix}`;
      return;
    }

    const duration = 1100;
    const start = performance.now();
    const startVal = 0;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic polynomial
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      el.textContent = `${current}${suffix}`;
      
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = `${target}${suffix}`; // Ensure exact final value
      }
    };

    el.textContent = `0${suffix}`;
    requestAnimationFrame(step);
  }

  /**
   * Animates skill progress bars filling up from 0 to their target percentage.
   * @param {HTMLElement} container The parent container of the bars
   */
  function animateBars(container) {
    const bars = container.querySelectorAll(".bar[data-level]");
    bars.forEach((bar) => {
      const level = Math.max(0, Math.min(100, Number(bar.dataset.level || 0)));
      const fill = bar.querySelector(".bar__fill");
      if (!fill) return;

      if (prefersReducedMotion) {
        fill.style.width = `${level}%`;
        return;
      }

      fill.style.width = "0%";
      // Trigger reflow to ensure the transition is executed
      void fill.offsetWidth;
      requestAnimationFrame(() => {
        fill.style.width = `${level}%`;
      });
    });
  }

  /**
   * Sets static ring progress values for circular indicators.
   */
  function setRings() {
    document.querySelectorAll(".ring[data-ring]").forEach((ring) => {
      const p = Math.max(0, Math.min(100, Number(ring.dataset.ring || 0)));
      ring.style.setProperty("--p", String(p));
    });
  }

  /**
   * Sets up intersection observers to trigger animations only when elements become visible.
   */
  const initObservers = () => {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;

          if (el.dataset.animate === "counters") {
            el.querySelectorAll(".count[data-count]").forEach(animateCount);
          }

          if (el.dataset.animate === "skills") {
            animateBars(el);
          }

          obs.unobserve(el);
        });
      },
      { threshold: 0.25 }
    );

    document.querySelectorAll("[data-animate]").forEach((el) => io.observe(el));
  };

  // Run initializations
  initCopyEmail();
  setRings();
  initObservers();
})();