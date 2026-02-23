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
  });
