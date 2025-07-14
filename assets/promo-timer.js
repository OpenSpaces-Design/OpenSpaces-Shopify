class PromoTimer extends HTMLElement {
  constructor() {
    super();
    this.countdownElement = this.querySelector('.promo-timer__countdown');
    if (!this.countdownElement) return;

    this.useAutoCountdown = this.countdownElement.dataset.useAutoCountdown === 'true';
    this.manualEndDatetime = this.countdownElement.dataset.manualEndDatetime;
    this.timerColor = this.countdownElement.dataset.timerColor;

    this.daysElement = this.querySelector('.promo-timer__days');
    this.hoursElement = this.querySelector('.promo-timer__hours');
    this.minutesElement = this.querySelector('.promo-timer__minutes');
    this.secondsElement = this.querySelector('.promo-timer__seconds');

    // Klaviyo form ID comes from the data attribute populated by the section setting
    this.klaviyoFormId = this.dataset.klaviyoFormId || 'Wyf6hq';

    this.init();

    // Only trigger Klaviyo form when the 7-day auto-countdown is enabled
    if (this.useAutoCountdown && this.klaviyoFormId) {
      // Bind click handler to open Klaviyo form
      this.openKlaviyoForm = this.openKlaviyoForm.bind(this);

      // Trigger on any click within the promo timer
      this.addEventListener('click', this.openKlaviyoForm);

      // If a CTA button exists, prevent its default navigation so that only the Klaviyo form appears
      const ctaButton = this.querySelector('.promo-timer__cta');
      if (ctaButton) {
        ctaButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openKlaviyoForm();
        });
      }
    }

    // NEW: ensure timer isn't hidden when viewed inside social-app in-app browsers
    this.adjustViewportOffset();
    window.addEventListener('resize', this.adjustViewportOffset.bind(this));
    window.addEventListener('orientationchange', this.adjustViewportOffset.bind(this));
    window.addEventListener('load', this.adjustViewportOffset.bind(this));
    // Re-run once after a short delay to capture late header-height calculation
    setTimeout(this.adjustViewportOffset.bind(this), 300);
  }

  init() {
    if (this.useAutoCountdown) {
      this.initAutoCountdown();
    } else {
      this.initManualCountdown();
    }
  }

  initAutoCountdown() {
    const storageKey = 'promo_timer_start';
    let startTime = localStorage.getItem(storageKey);

    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(storageKey, startTime);
    }

    const endTime = parseInt(startTime) + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    this.startCountdown(endTime);
  }

  initManualCountdown() {
    if (!this.manualEndDatetime) return;
    
    const endTime = new Date(this.manualEndDatetime).getTime();
    this.startCountdown(endTime);
  }

  startCountdown(endTime) {
    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = endTime - now;

      if (timeLeft <= 0) {
        this.handleCountdownEnd();
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      this.updateDisplay(days, hours, minutes, seconds);
      requestAnimationFrame(updateTimer);
    };

    updateTimer();
  }

  updateDisplay(days, hours, minutes, seconds) {
    if (this.daysElement) this.daysElement.textContent = days.toString().padStart(2, '0');
    if (this.hoursElement) this.hoursElement.textContent = hours.toString().padStart(2, '0');
    if (this.minutesElement) this.minutesElement.textContent = minutes.toString().padStart(2, '0');
    if (this.secondsElement) this.secondsElement.textContent = seconds.toString().padStart(2, '0');

    if (this.timerColor) {
      const elements = [this.daysElement, this.hoursElement, this.minutesElement, this.secondsElement];
      elements.forEach(el => {
        if (el) el.style.color = this.timerColor;
      });
    }
  }

  handleCountdownEnd() {
    if (this.useAutoCountdown) {
      localStorage.removeItem('promo_timer_start');
    }
    // Remove click listener so form cannot be opened afterwards
    this.removeEventListener('click', this.openKlaviyoForm);

    // Close Klaviyo form if it happens to be open
    if (typeof window !== 'undefined' && this.klaviyoFormId) {
      window._klOnsite = window._klOnsite || [];
      window._klOnsite.push(['closeForm', this.klaviyoFormId]);
    }

    // Remove the timer element from the DOM entirely for this session
    this.parentElement && this.parentElement.removeChild(this);
  }

  openKlaviyoForm() {
    if (typeof window !== 'undefined' && this.klaviyoFormId) {
      window._klOnsite = window._klOnsite || [];
      window._klOnsite.push(['openForm', this.klaviyoFormId]);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  Helper – adds extra top spacing for Instagram/TikTok in-app browsers      */
  /* -------------------------------------------------------------------------- */
  adjustViewportOffset() {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || navigator.vendor || '';
    const isInstagram = /Instagram/i.test(ua);
    const isTikTok = /TikTok/i.test(ua);
    if (!(isInstagram || isTikTok)) return; // only run inside target in-app browsers

    // Only apply on small screens where the social-app chrome is present
    if (window.innerWidth > 749) return;

    const headerHeightVar = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    const headerHeight = parseFloat(headerHeightVar) || document.querySelector('.section-header')?.offsetHeight || 0;

    // Typical height of IG/TikTok top chrome on iOS/Android is ~48-56px. Use 56px as a safe fallback.
    const inAppChromeHeight = 56;

    // Apply combined margin so the timer sits below both header and in-app chrome
    this.style.marginTop = `${headerHeight + inAppChromeHeight}px`;
  }
}

customElements.define('promo-timer', PromoTimer); 