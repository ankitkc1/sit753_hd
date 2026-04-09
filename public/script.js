document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".toggle-btn");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);

        // Close other open sections in the same paper
        const paper = btn.closest(".paper");
        paper.querySelectorAll(".paper-content").forEach(el => {
          if (el.id !== targetId) el.classList.add("hidden");
        });

        // Toggle clicked section
        targetEl.classList.toggle("hidden");
      });
    });

    // Burger Menu Logic
    const burger = document.getElementById("burger-menu");
    const navLinks = document.getElementById("nav-links");

    if (burger && navLinks) {
      burger.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("show");
        burger.classList.toggle("active", isOpen);
        burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      // Close menu when a nav link is clicked (mobile UX)
      navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("show");
          burger.classList.remove("active");
          burger.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Sticky header scroll effect
    const siteHeader = document.querySelector("header");
    if (siteHeader) {
      const onScroll = () => {
        siteHeader.classList.toggle("scrolled", window.scrollY > 10);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll(); // Run once on load
    }
  });
