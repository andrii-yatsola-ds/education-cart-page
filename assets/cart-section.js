const cartElement = 'cart-section';

if (!customElements.get(cartElement)) {
  class CartSection extends HTMLElement {
    constructor() {
      super();
      this.boundHandlePromoCodeUpdate = this.handlePromoCodeUpdate.bind(this);
    }

    connectedCallback() {
      this.init();
      document.addEventListener("liquid-ajax-cart:request-end", this.init.bind(this));
      document.addEventListener("cart-promo-code:updated", this.boundHandlePromoCodeUpdate);
    }

    disconnectedCallback() {
      document.removeEventListener("liquid-ajax-cart:request-end", this.init.bind(this));
      document.removeEventListener("cart-promo-code:updated", this.boundHandlePromoCodeUpdate);
      document.removeEventListener("liquid-ajax-cart:init", this.removeUpdateOnWindowFocus.bind(this));
    }

    init() {
      this.setVariables();
      this.removeUpdateOnWindowFocus();
    }

    removeUpdateOnWindowFocus() {
      if (window.liquidAjaxCart?.init) {
        window.liquidAjaxCart.conf("updateOnWindowFocus", false);
      } else {
        document.addEventListener("liquid-ajax-cart:init", this.removeUpdateOnWindowFocus.bind(this));
      }
    }

    setVariables() {
      this.cartForm = this.querySelector('.js-cart-form');
      this.contentWrapper = this.querySelector('.js-content-wrapper');
      this.debugMode = this.dataset.debugMode === 'true';
    }

    async handlePromoCodeUpdate(event) {
      const { sectionId, discountCodes } = event.detail;
      
      this.logDebug('Promo code update received', { sectionId, discountCodes });
      
      if (sectionId === this.dataset.sectionId) {
        await this.refreshCartSection();
      }
    }

    async refreshCartSection() {
      try {
        const sectionId = this.dataset.sectionId;
        const url = this.buildSectionUrl(sectionId);
        
        this.logDebug('Refreshing cart section', { sectionId, url });
        
        const response = await fetch(url);
        const html = await response.text();
        
        await this.updateSectionMarkup(html);
      } catch (error) {
        this.logDebug('Section refresh failed', { error: error.message });
        console.error('CartSection Refresh Error:', error);
      }
    }

    buildSectionUrl(sectionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('section_id', sectionId);
      return url.toString();
    }

    async updateSectionMarkup(html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      const newContentWrapper = tempDiv.querySelector('.js-content-wrapper');
      
      if (newContentWrapper && this.contentWrapper) {
        this.contentWrapper.innerHTML = newContentWrapper.innerHTML;
        this.logDebug('Section markup updated successfully');
      } else {
        this.logDebug('Section markup update failed - elements not found');
      }
    }

    logDebug(message, data = null) {
      if (!this.debugMode) return;
      
      const prefix = '[CartSection]';
      
      if (data) {
        console.log(`${prefix} ${message}:`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
  customElements.define(cartElement, CartSection);
}
