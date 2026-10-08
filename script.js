(() => {
  "use strict";

  const cfg = window.HEARTBEATS_SITE || {};
  const launchReady = cfg.launchReady === true;
  const menuButton = document.getElementById("menu-button");
  const mobileNav = document.getElementById("mobile-nav");
  const notice = document.getElementById("site-notice");
  const noticeText = document.getElementById("notice-text");
  const noticeClose = document.getElementById("notice-close");

  let noticeReturnFocus = null;

  function showNotice(message) {
    if (!notice || !noticeText) return;
    if (notice.hidden) noticeReturnFocus = document.activeElement;
    noticeText.textContent = message;
    notice.hidden = false;
    if (noticeClose) noticeClose.focus();
  }

  function closeNotice() {
    if (!notice || notice.hidden) return;
    notice.hidden = true;
    if (noticeReturnFocus && noticeReturnFocus.isConnected) noticeReturnFocus.focus();
  }

  function setMenu(open) {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    mobileNav.hidden = !open;
  }
  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", () => {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
      closeNotice();
    }
  });

  if (noticeClose) noticeClose.addEventListener("click", closeNotice);

  const stagingBanner = document.getElementById("staging-banner");
  const robotsMeta = document.getElementById("robots-meta");
  const canonicalLink = document.getElementById("canonical-link");
  const ogUrl = document.getElementById("og-url");
  const ogImage = document.getElementById("og-image");
  const twitterImage = document.getElementById("twitter-image");
  document.documentElement.classList.toggle("launch-ready", launchReady);

  const publicBaseUrl = String(cfg.publicBaseUrl || "").trim();
  if (launchReady) {
    if (stagingBanner) stagingBanner.hidden = true;
    document.querySelectorAll(".staging-note").forEach((node) => { node.hidden = true; });
    if (robotsMeta) robotsMeta.setAttribute("content", "index,follow");

    if (publicBaseUrl) {
      const normalizedBase = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
      const shareImageUrl = new URL("assets/brand/heartbeats-social-preview.png", normalizedBase).href;
      if (canonicalLink) canonicalLink.href = normalizedBase;
      if (ogUrl) ogUrl.setAttribute("content", normalizedBase);
      if (ogImage) ogImage.setAttribute("content", shareImageUrl);
      if (twitterImage) twitterImage.setAttribute("content", shareImageUrl);
    }
  } else if (robotsMeta) {
    robotsMeta.setAttribute("content", "noindex,nofollow");
  }
  document.querySelectorAll(".registration-action").forEach((action) => {
    const approvedUrl = String(cfg.registrationUrl || "").trim();
    if (launchReady && approvedUrl) {
      action.setAttribute("href", approvedUrl);
      action.setAttribute("rel", "noopener");
      return;
    }
    action.setAttribute("href", "#lessons");
    action.addEventListener("click", (event) => {
      event.preventDefault();
      showNotice("Registration opens after final launch approval.");
    });
  });

  document.querySelectorAll(".library-action").forEach((action) => {
    const infoUrl = String(cfg.libraryProgramInfoUrl || "").trim();
    if (launchReady && cfg.libraryProgramDetailsReady === true && infoUrl) {
      const link = document.createElement("a");
      link.className = action.className;
      link.textContent = "View library program details";
      link.href = infoUrl;
      link.rel = "noopener";
      action.replaceWith(link);
    } else {
      action.addEventListener("click", () => showNotice("Library program details are still being finalized."));
    }
  });
  const serviceArea = document.getElementById("service-area");
  if (serviceArea && cfg.serviceArea) serviceArea.textContent = cfg.serviceArea;

  const contactLive = document.getElementById("contact-live");
  const contactPending = document.getElementById("contact-pending");
  if (launchReady && contactLive && (cfg.studioEmail || cfg.studioPhone)) {
    const pieces = [];
    if (cfg.studioEmail) {
      pieces.push(`<a class="contact-item" href="mailto:${encodeURIComponent(cfg.studioEmail)}"><span class="contact-label">Email</span><span class="contact-value">${escapeHtml(cfg.studioEmail)}</span></a>`);
    }
    if (cfg.studioPhone) {
      const tel = String(cfg.studioPhone).replace(/[^+0-9]/g, "");
      pieces.push(`<a class="contact-item" href="tel:${tel}"><span class="contact-label">Call / text</span><span class="contact-value">${escapeHtml(cfg.studioPhone)}</span></a>`);
    }
    contactLive.innerHTML = pieces.join("");
    contactLive.hidden = false;
    if (contactPending) contactPending.hidden = true;
  }

  const policyLink = document.getElementById("parent-policy-link");
  if (launchReady && policyLink && cfg.parentPolicyUrl) {
    policyLink.href = cfg.parentPolicyUrl;
    policyLink.hidden = false;
  }
  const librarySection = document.getElementById("library-programs");
  const libraryPublicReady = cfg.libraryProgramEnabled !== false && cfg.libraryProgramDetailsReady === true;
  if (librarySection && (!libraryPublicReady && launchReady || cfg.libraryProgramEnabled === false)) {
    librarySection.hidden = true;
    document.querySelectorAll('a[href="#library-programs"]').forEach((link) => { link.hidden = true; });
  }

  const sectionNavLinks = Array.from(document.querySelectorAll(
    '.desktop-nav a[href^="#"], .mobile-nav a[href^="#"]'
  )).filter((link) => !link.hidden);

  function setActiveSection(sectionId) {
    sectionNavLinks.forEach((link) => {
      const active = link.getAttribute("href") === "#" + sectionId;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && sectionNavLinks.length) {
    const visibleSections = Array.from(document.querySelectorAll("main section[id], footer[id]"))
      .filter((section) => !section.hidden);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) setActiveSection(visible[0].target.id);
    }, {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0, .1, .25, .5]
    });

    visibleSections.forEach((section) => observer.observe(section));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
