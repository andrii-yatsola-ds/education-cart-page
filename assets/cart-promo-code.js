const cartPromoCodeElement = 'cart-promo-code';

if (!customElements.get(cartPromoCodeElement)) {
  class CartPromoCode extends HTMLElement {
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
      this.setVariables();
      this.initEventListeners();
    }

    setVariables() {
      this.promoCodeInput = this.querySelector('.js-promo-code-input');
      this.promoCodeApply = this.querySelector('.js-promo-code-apply');
      this.promoCodeInputWrapper = this.querySelector('.js-promo-code-input-wrapper');
      this.promoCodeError = this.querySelector('.js-promo-code-error');
      this.removePromoCodeButtons = this.querySelectorAll('.js-promo-code-remove');
      this.promoCodeStrings = window.promoCodeStrings;
      
      this.discountCodes = this.getDiscountCodes();
    }

    getDiscountCodes() {
      const discountCodesString = this.dataset.discountCodes;
      return discountCodesString && discountCodesString !== '' 
        ? discountCodesString.split(',').filter(code => code.trim() !== '')
        : [];
    }

    initEventListeners() {
      this.promoCodeApply?.addEventListener('click', this.handlePromoCodeApply.bind(this));
      this.removePromoCodeButtons?.forEach(button => {
        button.addEventListener('click', this.handleRemovePromoCode.bind(this));
      });
      this.promoCodeInput?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.handlePromoCodeApply();
        }
      });
    }

    handlePromoCodeApply() {
      const promoCode = this.promoCodeInput.value.trim();

      if (this.validatePromoCode(promoCode)) {
        this.applyPromoCode(promoCode);
      }
    }

    validatePromoCode(promoCode) {
      if (this.isEmptyPromoCode(promoCode)) {
        this.showError(this.promoCodeStrings.empty);
        return false;
      }

      if (this.isPromoCodeAlreadyApplied(promoCode)) {
        this.showError(this.promoCodeStrings.already_applied);
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
      this.promoCodeApply.textContent = isLoading ? this.promoCodeStrings.loading : this.promoCodeStrings.button;
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
      if (data.discount_codes && data.discount_codes.length > 0) {
        const appliedCode = data.discount_codes.find(code => code.code.toLowerCase() === this.promoCodeInput.value.trim().toLowerCase());
        
        if (appliedCode && appliedCode.code.toLowerCase() === this.promoCodeInput.value.trim().toLowerCase()) {
          if (appliedCode.applicable) {
            this.promoCodeInput.value = '';
            this.clearError();
            this.updateCartSectionMarkup();
          } else {
            this.showError(this.promoCodeStrings.not_applicable);
            return;
          }
        }
      }
      this.updateCartSectionMarkup();
    }

    handleError(error) {
      console.error(error);
      this.showError(this.promoCodeStrings.error);
    }

    resetState() {
      this.setLoadingState(false);
      this.clearError();
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

    updateCartSectionMarkup() {
      const sectionId = this.dataset.sectionId;
      const url = this.buildSectionUrl(sectionId);
      
      fetch(url)
        .then(res => res.text())
        .then(data => {
          const newCartSection = document.createElement('div');
          newCartSection.innerHTML = data;
          const newContentWrapper = newCartSection.querySelector('.js-content-wrapper');

          if (newContentWrapper && this.closest('.js-content-wrapper')) {
            this.closest('.js-content-wrapper').innerHTML = newContentWrapper.innerHTML;
            this.init();
          }
        })
        .catch(error => {
          console.error(error);
        });
    }

    buildSectionUrl(sectionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('section_id', sectionId);
      return url.toString();
    }
  }
  customElements.define(cartPromoCodeElement, CartPromoCode);
} 