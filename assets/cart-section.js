const cartElement = 'cart-section';

if (!customElements.get(cartElement)) {
  class CartSection extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.init();

      document.addEventListener("liquid-ajax-cart:request-end", this.init.bind(this));
    }

    disconnectedCallback() {
      this.promoCodeApply?.removeEventListener('click', this.handlePromoCodeApply.bind(this));
      this.promoCodeInput?.removeEventListener('keypress', this.handlePromoCodeApply.bind(this));

      document.removeEventListener("liquid-ajax-cart:request-end", this.init.bind(this));
    }

    init() {
      console.log("init");
      this.setVariables();
      this.initEventListeners();
    }

    setVariables() {
      this.cartForm = this.querySelector('.js-cart-form');
      this.promoCodeInput = this.querySelector('.js-promo-code-input');
      this.promoCodeApply = this.querySelector('.js-promo-code-apply');
      this.promoCodeInputWrapper = this.querySelector('.js-promo-code-input-wrapper');
      this.promoCodeError = this.querySelector('.js-promo-code-error');
      this.removePromoCodeButtons = this.querySelectorAll('.js-promo-code-remove');
      this.contentWrapper = this.querySelector('.js-content-wrapper');
      
      this.discountCodes = this.cartForm?.dataset.discountCodes.split(',');
    }

    initEventListeners() {
      this.addPromoCodeApplyListener();
      this.addRemovePromoCodeListeners();
      this.addEnterKeyListener();
    }

    addPromoCodeApplyListener() {
      if (this.promoCodeApply) {
        this.promoCodeApply.addEventListener('click', this.handlePromoCodeApply.bind(this));
      }
    }

    addRemovePromoCodeListeners() {
      if (this.removePromoCodeButtons) {
        this.removePromoCodeButtons.forEach(button => {
          button.addEventListener('click', this.handleRemovePromoCode.bind(this));
        });
      }
    }

    addEnterKeyListener() {
      if (this.promoCodeInput) {
        this.promoCodeInput.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            this.handlePromoCodeApply();
          }
        });
      }
    }

    handleRemovePromoCode(event) {
      const promoCode = event.target.closest('.js-promo-code-remove').dataset.promoCode;
      this.removePromoCode(promoCode);
    }

    removePromoCode(promoCode) {
      this.removePromoCodeFromArray(promoCode);
      this.updateCartDiscounts();
    }

    removePromoCodeFromArray(promoCode) {
      if (this.discountCodes) {
        this.discountCodes = this.discountCodes.filter(code => code !== promoCode);
      }
    }

    handlePromoCodeApply() {
      const promoCode = this.promoCodeInput.value.trim();

      if (this.validatePromoCode(promoCode)) {
        this.applyPromoCode(promoCode);
      }
    }

    validatePromoCode(promoCode) {
      if (this.isEmptyPromoCode(promoCode)) {
        this.showError('Please enter a promo code');
        return false;
      }

      if (this.isPromoCodeAlreadyApplied(promoCode)) {
        this.showError('Promo code already applied');
        return false;
      }

      this.clearError();
      return true;
    }

    isEmptyPromoCode(promoCode) {
      return !promoCode || promoCode.trim() === '';
    }

    isPromoCodeAlreadyApplied(promoCode) {
      return this.discountCodes && this.discountCodes.includes(promoCode);
    }

    showError(message) {
      console.log("showError", this.promoCodeInputWrapper, this.promoCodeError);

      if (this.promoCodeInputWrapper && this.promoCodeError) {
        this.promoCodeInputWrapper.classList.add('error');
        this.promoCodeError.textContent = message;
      }
    }

    clearError() {
      if (this.promoCodeInputWrapper && this.promoCodeError) {
        this.promoCodeInputWrapper.classList.remove('error');
        this.promoCodeError.textContent = '';
      }
    }

    applyPromoCode(promoCode) {
      this.addPromoCodeToArray(promoCode);
      this.updateCartDiscounts();
    }

    addPromoCodeToArray(promoCode) {
      if (!this.discountCodes) {
        this.discountCodes = [];
      }
      this.discountCodes.push(promoCode);
    }

    updateCartDiscounts() {
      this.setLoadingState(true);
      const formData = this.createFormData(this.discountCodes);
      this.sendPromoCodeRequest(formData);
    }

    createFormData(codes) {
      const formData = new FormData();
      const discountString = this.formatDiscountCodes(codes);
      formData.append('discount', discountString);
      return formData;
    }

    formatDiscountCodes(codes) {
      if (!codes) return '';
      return Array.isArray(codes) ? codes.join(',') : codes;
    }

    setLoadingState(isLoading) {
      this.promoCodeApply.disabled = isLoading;
      this.promoCodeApply.textContent = isLoading ? 'Applying...' : 'Apply';
    }

    sendPromoCodeRequest(formData) {
      fetch('/cart/update.js', { 
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => this.handleSuccess(data))
      .catch(error => this.handleError(error))
      .finally(() => this.resetState());
    }

    handleSuccess(data) {
      console.log("handleSuccess", data);

      if (data.discount_codes && data.discount_codes.length > 0) {
        const appliedCode = data.discount_codes.find(code => code.code.toLowerCase() === this.promoCodeInput.value.trim().toLowerCase());

        if (appliedCode && appliedCode.code.toLowerCase() === this.promoCodeInput.value.trim().toLowerCase()) {
          if (appliedCode.applicable) {
            this.promoCodeInput.value = '';
            this.clearError();
          } else {  
            console.log("handleSuccess 3.1");
            console.log("not applicable");
            this.showError('This promo code is not applicable');
            return;
          }
        }
      }
      this.updateCartSectionMarkup(); 
    }

    handleError(error) {
      console.error('Error applying discount code:', error);
      this.showError('Error applying promo code');
    }

    resetState() {
      this.setLoadingState(false);
      this.clearError();
    }

    updateCartSectionMarkup() {
      const sectionId = this.dataset.sectionId;
      const url = this.buildSectionUrl(sectionId);
      
      fetch(url)
      .then(res => res.text())
      .then(data => {
        const newCartSection = document.createElement('div');
        newCartSection.innerHTML = data;
        const newContentWrapper = newCartSection.querySelector('.js-content-wrapper');
  
        if (newContentWrapper && this.contentWrapper) {
          this.contentWrapper.innerHTML = newContentWrapper.innerHTML;
          this.init();
        }
      })
      .catch(error => {
        console.error('Error refreshing page:', error);
      });
    }

    buildSectionUrl(sectionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('section_id', sectionId);
      return url.toString();
    }
  }
  customElements.define(cartElement, CartSection);
}
