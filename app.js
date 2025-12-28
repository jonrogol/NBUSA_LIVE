/* Theme preference management */
(() => {
  const STORAGE_KEY = 'nbusa-theme';
  const root = document.documentElement;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const getStoredTheme = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  };

  const persistTheme = (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* ignore storage failures */
    }
  };

  const updateMeta = (theme) => {
    if (!metaTheme) return;
    const color = theme === 'dark' ? '#050A10' : '#F4F8FB';
    metaTheme.setAttribute('content', color);
  };

  const applyTheme = (theme, options) => {
    const mode = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = mode;
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    updateMeta(mode);
    if (!options || options.persist !== false) {
      persistTheme(mode);
    }
    return mode;
  };

  const syncToggle = (theme) => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.setAttribute('data-theme', theme);
    toggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    );
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  };

  let currentTheme = applyTheme(getStoredTheme() || (prefersDark.matches ? 'dark' : 'light'), {
    persist: false,
  });
  syncToggle(currentTheme);

  ready(() => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      currentTheme = applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
      syncToggle(currentTheme);
    });
  });

  const handleSystemChange = (event) => {
    if (getStoredTheme()) return;
    currentTheme = applyTheme(event.matches ? 'dark' : 'light', { persist: false });
    syncToggle(currentTheme);
  };

  if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', handleSystemChange);
  } else if (typeof prefersDark.addListener === 'function') {
    prefersDark.addListener(handleSystemChange);
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    currentTheme = applyTheme(event.newValue, { persist: false });
    syncToggle(currentTheme);
  });
})();

/* Hero carousel support */
(() => {
  const hero = document.querySelector('.hero.has-carousel');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('.hero-slide'));
  if (slides.length <= 1) return;

  let index = 0;
  const INTERVAL = 6000;

  const showSlide = (n) => {
    slides.forEach((slide, i) => {
      const isActive = i === n;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  };

  showSlide(index);

  window.setInterval(() => {
    index = (index + 1) % slides.length;
    showSlide(index);
  }, INTERVAL);
})();

/* Cookie / consent management */
(() => {
  const CONSENT_KEY = 'nbusa_consent';
  const ANALYTICS_SRC = window.NBUSA_ANALYTICS_SRC || '';

  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cb-accept');
  const declineBtn = document.getElementById('cb-decline');
  const manageBtn = document.getElementById('cb-manage');
  const prefsPanel = document.getElementById('cookie-prefs');
  const saveBtn = document.getElementById('cb-save');
  const analyticsInput = document.getElementById('pref-analytics');

  const readConsent = () => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  };

  const persistConsent = (consent) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch (err) {
      /* ignore storage failures */
    }
  };

  const loadAnalytics = () => {
    if (!ANALYTICS_SRC) {
      console.info('Analytics consent granted, but no NBUSA_ANALYTICS_SRC configured.');
      return;
    }
    if (document.querySelector('script[data-analytics-loader]')) return;
    const script = document.createElement('script');
    script.src = ANALYTICS_SRC;
    script.defer = true;
    script.setAttribute('data-analytics-loader', 'true');
    document.head.appendChild(script);
  };

  const applyConsent = (consent) => {
    if (!consent) return;
    if (consent.analytics) {
      loadAnalytics();
    }
  };

  const showBanner = () => {
    if (!banner) return;
    banner.setAttribute('aria-hidden', 'false');
    banner.classList.add('visible');
    const focusTarget = acceptBtn || manageBtn || declineBtn;
    if (focusTarget) focusTarget.focus();
  };

  const hideBanner = () => {
    if (!banner) return;
    banner.setAttribute('aria-hidden', 'true');
    banner.classList.remove('visible');
  };

  const existingConsent = readConsent();
  if (existingConsent) {
    applyConsent(existingConsent);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      const consent = { necessary: true, analytics: true };
      persistConsent(consent);
      applyConsent(consent);
      hideBanner();
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      const consent = { necessary: true, analytics: false };
      persistConsent(consent);
      applyConsent(consent);
      hideBanner();
    });
  }

  if (manageBtn && prefsPanel) {
    manageBtn.addEventListener('click', () => {
      const hidden = prefsPanel.hasAttribute('hidden');
      if (hidden) {
        prefsPanel.removeAttribute('hidden');
        manageBtn.setAttribute('aria-expanded', 'true');
        if (analyticsInput) analyticsInput.focus();
      } else {
        prefsPanel.setAttribute('hidden', '');
        manageBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const analytics = analyticsInput ? Boolean(analyticsInput.checked) : false;
      const consent = { necessary: true, analytics };
      persistConsent(consent);
      applyConsent(consent);
      hideBanner();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (existingConsent) {
      hideBanner();
    } else {
      showBanner();
    }
  });
})();

/* Header, navigation, and scroll behaviors */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  ready(() => {
    const header = document.querySelector('.header');
    if (!header) return;

    const nav = document.getElementById('primary-nav');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = Array.from(document.querySelectorAll('.nav .nav-link'));
    const navLinkMap = new Map();
    let currentActiveId = null;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#') || href.length <= 1) return;
      navLinkMap.set(href.slice(1), link);
    });

    const sections = Array.from(document.querySelectorAll('section[id]'));
    let observedSections = sections
      .filter((section) => navLinkMap.has(section.id))
      .sort((a, b) => a.offsetTop - b.offsetTop);
    const body = document.body;
    const headerRevealZone = 80;

    const updateSectionOrder = () => {
      observedSections = sections
        .filter((section) => navLinkMap.has(section.id))
        .sort((a, b) => a.offsetTop - b.offsetTop);
    };

    const updateHeaderMetrics = () => {
      const height = Math.max(header.offsetHeight || 0, 1);
      root.style.setProperty('--header-height', `${height}px`);
    };

    const getAnchorOffset = () => {
      const styles = getComputedStyle(root);
      const gap = parseFloat(styles.getPropertyValue('--header-gap')) || 0;
      return (header.offsetHeight || 0) + gap;
    };

    let lastScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    let ticking = false;

    const updateHeaderState = (initial = false) => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const atTop = scrollY <= 4;
      header.classList.toggle('at-top', atTop);
      header.classList.toggle('is-solid', !atTop);

      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const viewport = window.innerHeight;
      const maxScroll = Math.max(docHeight - viewport, 1);
      const progress = (scrollY / maxScroll) * 100;
      root.style.setProperty('--scroll-progress', progress.toFixed(2));

      if (initial) {
        header.classList.remove('is-hidden');
        lastScroll = scrollY;
        return;
      }

      if (!reduceMotion.matches) {
        const hideThreshold = (header.offsetHeight || 0) * 1.25;
        const goingDown = scrollY > lastScroll + 12;
        const goingUp = scrollY < lastScroll - 12;

        if (goingDown && scrollY > hideThreshold) {
          header.classList.add('is-hidden');
        } else if (goingUp || scrollY <= hideThreshold) {
          header.classList.remove('is-hidden');
        }
      } else {
        header.classList.remove('is-hidden');
      }

      lastScroll = scrollY;
    };

    const updateActiveNavFromScroll = () => {
      if (!observedSections.length) {
        setActiveLink(null);
        return;
      }

      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (scrollY < 100) {
        setActiveLink(null);
        return;
      }

      const offset = getAnchorOffset();
      const scrollPos = scrollY + offset + 50; // Add buffer for better triggering
      let activeId = null;

      for (const section of observedSections) {
        if (section.offsetTop <= scrollPos) {
          activeId = section.id;
        } else {
          break;
        }
      }

      setActiveLink(activeId);
    };

    const requestTick = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateHeaderState();
        updateActiveNavFromScroll();
        ticking = false;
      });
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener(
      'resize',
      () => {
        updateHeaderMetrics();
        updateSectionOrder();
        updateHeaderState(true);
        updateActiveNavFromScroll();
      },
      { passive: true },
    );

    window.addEventListener(
      'mousemove',
      (event) => {
        if (reduceMotion.matches) return;
        if (event.clientY <= headerRevealZone) {
          header.classList.remove('is-hidden');
        }
      },
      { passive: true },
    );

    updateHeaderMetrics();
    updateHeaderState(true);

    // Ensure sections are properly sorted after initial render
    window.setTimeout(() => {
      updateSectionOrder();
      updateActiveNavFromScroll();
    }, 100);

    let idleTimer = null;
    const IDLE_DELAY = 2200;

    const scheduleIdleShow = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = window.setTimeout(() => {
        header.classList.remove('is-hidden');
      }, IDLE_DELAY);
    };

    ['mousemove', 'keydown', 'touchstart', 'wheel'].forEach((eventName) => {
      window.addEventListener(eventName, scheduleIdleShow, { passive: true });
    });
    scheduleIdleShow();

    const setNavOpen = (open) => {
      if (!nav || !navToggle) return;
      nav.classList.toggle('is-open', open);
      navToggle.classList.toggle('is-active', open);
      body.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        header.classList.remove('is-hidden');
      }
    };

    if (nav && navToggle) {
      setNavOpen(false);

      navToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setNavOpen(!nav.classList.contains('is-open'));
      });

      document.addEventListener('click', (event) => {
        if (!nav.classList.contains('is-open')) return;
        if (nav.contains(event.target) || navToggle.contains(event.target)) return;
        setNavOpen(false);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
          setNavOpen(false);
          navToggle.focus();
        }
      });

      window.addEventListener(
        'resize',
        () => {
          if (window.innerWidth > 768) {
            setNavOpen(false);
          }
        },
        { passive: true },
      );
    }

    const scrollToSection = (id, options) => {
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;

      const offset = getAnchorOffset();
      const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const top = Math.max(target.getBoundingClientRect().top + currentY - offset, 0);
      const instant = options && options.instant;

      window.scrollTo({
        top,
        behavior: instant || reduceMotion.matches ? 'auto' : 'smooth',
      });
    };

    const setActiveLink = (id) => {
      const normalized = id && navLinkMap.has(id) ? id : null;

      if (!normalized) {
        if (currentActiveId !== null) {
          currentActiveId = null;
          navLinks.forEach((link) => link.classList.remove('active'));
        }
        return;
      }

      if (normalized === currentActiveId) return;
      currentActiveId = normalized;

      const activeLink = navLinkMap.get(normalized);
      navLinks.forEach((link) => link.classList.toggle('active', link === activeLink));
    };

    navLinks.forEach((link) => {
      link.addEventListener(
        'click',
        (event) => {
          const href = link.getAttribute('href');
          if (!href || !href.startsWith('#')) return;
          event.preventDefault();
          const id = href.slice(1);
          scrollToSection(id);
          setNavOpen(false);
          setActiveLink(id);
          if (history.replaceState) {
            history.replaceState(null, '', `#${id}`);
          } else {
            window.location.hash = id;
          }
        },
        true,
      );
    });

    if (window.location.hash) {
      const initialId = window.location.hash.slice(1);
      if (initialId) {
        window.setTimeout(() => {
          if (initialId === 'top') {
            window.scrollTo({ top: 0, behavior: 'auto' });
            setActiveLink(null);
          } else {
            scrollToSection(initialId, { instant: true });
            setActiveLink(initialId);
          }
        }, 80);
      }
    }

    window.addEventListener('hashchange', () => {
      const id = window.location.hash.slice(1);
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveLink(null);
      } else if (id) {
        scrollToSection(id);
        setActiveLink(id);
      }
    });
  });
})();

/* Language selector and translations */
(() => {
  const strings = window.STR || {};
  const available = Object.keys(strings);
  if (!available.length) return;

  const LANG_LABELS = { en: 'EN', ja: 'JA', pt: 'PT' };
  const LANG_NAMES = { en: 'English', ja: '日本語', pt: 'Português' };
  const LANG_FLAG = {
    en: { src: 'assets/flag-usa.svg', alt: 'Flag of the United States' },
    ja: { src: 'assets/flag-japan.svg', alt: 'Flag of Japan' },
    pt: { src: 'assets/flag-brazil.svg', alt: 'Flag of Brazil' },
  };
  const HERO_HIGHLIGHT = {
    en: 'trade and innovation',
    ja: '貿易とイノベーション',
    pt: 'comércio e inovação',
  };
  const STORAGE_KEY = 'nbusa-language';

  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const getStoredLanguage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  };

  const persistLanguage = (code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (err) {
      /* ignore storage failures */
    }
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  ready(() => {
    const dropdown = document.querySelector('.lang-select');
    if (!dropdown) return;

    const currentBtn = dropdown.querySelector('.lang-current');
    const currentLabel = dropdown.querySelector('.lang-label');
    const currentName = dropdown.querySelector('.lang-name');
    const currentFlag = dropdown.querySelector('[data-current-flag]');
    const defaultFlagSrc = currentFlag
      ? currentFlag.getAttribute('data-default-src') || currentFlag.getAttribute('src') || ''
      : '';
    const options = Array.from(dropdown.querySelectorAll('.lang-option'));
    const desktopQuery = window.matchMedia('(min-width: 992px)');

    let language = getStoredLanguage();
    if (!language || !strings[language]) {
      language = available.includes('en') ? 'en' : available[0];
    }

    const setDropdownState = (open) => {
      dropdown.dataset.open = open ? 'true' : 'false';
      dropdown.classList.toggle('is-open', open);
      if (currentBtn) {
        currentBtn.setAttribute('aria-expanded', String(open));
      }
      const allowFocus = open || desktopQuery.matches;
      options.forEach((option) => {
        option.tabIndex = allowFocus ? 0 : -1;
      });
    };

    const handleDesktopChange = () => {
      const isOpen = dropdown.dataset.open === 'true';
      setDropdownState(isOpen);
    };

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', handleDesktopChange);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(handleDesktopChange);
    }

    const updateCurrentLabel = (code) => {
      const label = LANG_LABELS[code] || code.toUpperCase();
      if (currentLabel) {
        currentLabel.textContent = label;
      }

      if (currentName) {
        currentName.textContent = LANG_NAMES[code] || label;
      }

      if (currentFlag) {
        const meta = LANG_FLAG[code];
        if (meta && meta.src) {
          currentFlag.setAttribute('src', meta.src);
          currentFlag.setAttribute('alt', meta.alt || '');
        } else if (defaultFlagSrc) {
          currentFlag.setAttribute('src', defaultFlagSrc);
          currentFlag.setAttribute('alt', '');
        }
        currentFlag.dataset.lang = code;
      }
    };

    const applyLanguage = (code, optionsConfig) => {
      if (!strings[code]) return;
      language = code;
      const map = strings[code];
      const shouldPersist = !optionsConfig || optionsConfig.persist !== false;

      if (shouldPersist) {
        persistLanguage(code);
      }

      document.documentElement.lang = code;
      updateCurrentLabel(code);

      if (currentBtn) {
        const readable = LANG_NAMES[code] || code.toUpperCase();
        currentBtn.setAttribute('aria-label', `Language: ${readable}`);
        currentBtn.setAttribute('data-current', code);
      }

      options.forEach((option) => {
        const optionCode = option.id.replace('lang-', '');
        const isCurrent = optionCode === code;
        option.setAttribute('aria-current', isCurrent ? 'true' : 'false');
        option.classList.toggle('is-active', isCurrent);
      });

      document.querySelectorAll('[data-i18n]').forEach((node) => {
        const key = node.getAttribute('data-i18n');
        const value = map[key];
        if (!value) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
          node.setAttribute('placeholder', value);
        } else {
          node.textContent = value;
        }
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
        const key = node.getAttribute('data-i18n-placeholder');
        const value = map[key];
        if (!value) return;
        node.setAttribute('placeholder', value);
      });

      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle && map.hero_title) {
        if (map.hero_title.includes('<')) {
          heroTitle.innerHTML = map.hero_title;
        } else {
          const highlight = HERO_HIGHLIGHT[code];
          if (highlight && map.hero_title.toLowerCase().includes(highlight.toLowerCase())) {
            const regex = new RegExp(escapeRegExp(highlight), 'i');
            heroTitle.innerHTML = map.hero_title.replace(
              regex,
              (match) => `<span class="highlight-awb">${match}</span>`,
            );
          } else {
            heroTitle.textContent = map.hero_title;
          }
        }
      }

      const heroSubtitle = document.querySelector('.hero-subtitle');
      if (heroSubtitle && map.hero_tag) {
        heroSubtitle.textContent = map.hero_tag;
      }

      const aboutBlurb = document.querySelector('#about .lead');
      if (aboutBlurb && map.about_blurb) {
        aboutBlurb.textContent = map.about_blurb;
      }

      const servicesHeading = document.querySelector('#services .section-header h2');
      if (servicesHeading && map.services_title) {
        servicesHeading.textContent = map.services_title;
      }
    };

    applyLanguage(language, { persist: false });
    setDropdownState(false);

    if (currentBtn) {
      currentBtn.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = dropdown.dataset.open === 'true';
        setDropdownState(!isOpen);
      });

      currentBtn.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setDropdownState(true);
          if (options[0]) {
            options[0].focus();
          }
        }
      });
    }

    options.forEach((option, index) => {
      option.addEventListener('click', (event) => {
        event.preventDefault();
        const code = option.id.replace('lang-', '');
        applyLanguage(code);
        setDropdownState(false);
        if (currentBtn) currentBtn.focus();
      });

      option.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          setDropdownState(false);
          if (currentBtn) currentBtn.focus();
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const next = options[index + 1] || options[0];
          next.focus();
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prev = options[index - 1] || options[options.length - 1];
          prev.focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        setDropdownState(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setDropdownState(false);
      }
    });
  });
})();

/* Hero parallax control */
(() => {
  const heroBackground = document.querySelector('.hero-background');
  if (!heroBackground) return;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  const update = () => {
    const scrollY = reduceMotion.matches
      ? 0
      : window.pageYOffset || document.documentElement.scrollTop || 0;
    const capped = Math.max(0, Math.min(scrollY, 1200));
    root.style.setProperty('--hero-parallax', String(capped));
    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  const handlePreferenceChange = () => {
    update();
  };

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', handlePreferenceChange);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(handlePreferenceChange);
  }
})();

/* Reveal-on-scroll animations */
(() => {
  const elements = Array.from(document.querySelectorAll('.reveal'));
  if (!elements.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const root = document.documentElement;
  root.classList.add('reveal-ready');

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -12% 0px',
    },
  );

  elements.forEach((el) => observer.observe(el));

  const handlePreferenceChange = (event) => {
    if (!event.matches) return;
    observer.disconnect();
    elements.forEach((el) => el.classList.add('visible'));
    root.classList.remove('reveal-ready');
  };

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', handlePreferenceChange);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(handlePreferenceChange);
  }
})();

/* Stats counter animation */
(() => {
  const section = document.querySelector('.stats-band');
  if (!section) return;

  const statNodes = Array.from(section.querySelectorAll('.stat-num[data-target]'));
  if (!statNodes.length) return;

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const buildFormatter = (decimals, grouping) => {
    if (!grouping) return null;
    try {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch (err) {
      return null;
    }
  };

  const formatValue = (value, { decimals, suffix, prefix, formatter, grouping }) => {
    const limit = value;
    const rounded = decimals > 0 ? Number(limit.toFixed(decimals)) : Math.round(limit);
    let output = '';
    if (formatter) {
      output = formatter.format(rounded);
    } else if (decimals > 0) {
      output = rounded.toFixed(decimals);
    } else {
      output = String(rounded);
    }
    if (!grouping && decimals === 0) {
      output = String(rounded);
    }
    return `${prefix || ''}${output}${suffix || ''}`;
  };

  const animateStat = (node, config) => {
    const startTime = performance.now();
    const duration = config.duration;
    const easeOutCubic = (t) => 1 - (1 - t) ** 3;

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = config.target * eased;
      node.textContent = formatValue(current, config);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        node.textContent = formatValue(config.target, config);
      }
    };

    node.textContent = formatValue(0, config);
    requestAnimationFrame(step);
  };

  const prepareConfig = (node) => {
    const rawTarget = node.dataset.target || node.textContent || '0';
    const normalized =
      typeof rawTarget === 'string' ? rawTarget.replace(/[^0-9.\-]/g, '') : rawTarget;
    const target = Number.parseFloat(normalized);
    const suffix = node.dataset.suffix || '';
    const prefix = node.dataset.prefix || '';
    const decimals = Number.parseInt(node.dataset.decimals || '0', 10) || 0;
    const grouping = node.dataset.grouping !== 'false';
    const duration = Math.max(Number.parseInt(node.dataset.duration || '1600', 10) || 1600, 400);
    const formatter = buildFormatter(decimals, grouping);

    return {
      target: Number.isFinite(target) ? target : 0,
      suffix,
      prefix,
      decimals,
      grouping,
      duration,
      formatter,
    };
  };

  const configs = new Map();

  const finalizeStat = (node, config) => {
    node.textContent = formatValue(config.target, config);
    node.dataset.animated = 'true';
  };

  const runAnimation = () => {
    statNodes.forEach((node) => {
      if (node.dataset.animated === 'true') return;
      const config = configs.get(node) || prepareConfig(node);
      configs.set(node, config);
      if (prefersReduce.matches) {
        finalizeStat(node, config);
      } else {
        animateStat(node, config);
        node.dataset.animated = 'true';
      }
    });
  };

  if (prefersReduce.matches) {
    runAnimation();
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runAnimation();
        obs.disconnect();
      });
    },
    {
      threshold: 0.35,
      rootMargin: '0px 0px -10% 0px',
    },
  );

  observer.observe(section);

  const handlePreferenceChange = (event) => {
    if (!event.matches) return;
    observer.disconnect();
    runAnimation();
  };

  if (typeof prefersReduce.addEventListener === 'function') {
    prefersReduce.addEventListener('change', handlePreferenceChange);
  } else if (typeof prefersReduce.addListener === 'function') {
    prefersReduce.addListener(handlePreferenceChange);
  }
})();

/* Magnetic hover effect */
(() => {
  const elements = Array.from(document.querySelectorAll('.magnetic'));
  if (!elements.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const reset = (element) => {
    element.style.transform = '';
  };

  if (reduceMotion.matches) {
    elements.forEach(reset);
    return;
  }

  const update = (event, element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const translateX = clamp(deltaX * 0.12, -14, 14);
    const translateY = clamp(deltaY * 0.12, -14, 14);
    element.style.transform = `translate(${translateX}px, ${translateY}px)`;
  };

  elements.forEach((element) => {
    element.addEventListener('mousemove', (event) => update(event, element));
    element.addEventListener('mouseleave', () => reset(element));
    element.addEventListener('focus', () => reset(element));
    element.addEventListener('blur', () => reset(element));
  });

  const handlePreferenceChange = (event) => {
    if (event.matches) {
      elements.forEach(reset);
    }
  };

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', handlePreferenceChange);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(handlePreferenceChange);
  }
})();
