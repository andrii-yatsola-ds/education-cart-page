const cartPromoCodeElement = 'cart-promo-code';

if (!customElements.get(cartPromoCodeElement)) {
  class CartPromoCode extends HTMLElement {
    constructor() {
      super();
      this.boundHandlePromoCodeApply = this.handlePromoCodeApply.bind(this);
      this.boundHandleRemovePromoCode = this.handleRemovePromoCode.bind(this);
      this.boundHandleKeyPress = this.handleKeyPress.bind(this);
      this.boundInit = this.init.bind(this);
    }
    
    connectedCallback() {
      this.init();
      document.addEventListener("liquid-ajax-cart:request-end", this.boundInit);
    }

    disconnectedCallback() {
      this.cleanupEventListeners();
      document.removeEventListener("liquid-ajax-cart:request-end", this.boundInit);
    }
    
    init() {
      this.initializeElements();
      this.initializeState();
      this.setupEventListeners();
      this.logDebug('Component initialized');
    }

    initializeElements() {
      this.elements = {
        input: this.querySelector('.js-promo-code-input'),
        applyButton: this.querySelector('.js-promo-code-apply'),
        inputWrapper: this.querySelector('.js-promo-code-input-wrapper'),
        errorDisplay: this.querySelector('.js-promo-code-error'),
        removeButtons: this.querySelectorAll('.js-promo-code-remove')
      };
    }

    initializeState() {
      this.debugMode = this.dataset.debugMode === 'true';
      this.strings = window.promoCodeStrings || {};
      this.discountCodes = this.parseDiscountCodes();
    }

    parseDiscountCodes() {
      const discountCodesString = this.dataset.discountCodes;
      if (!discountCodesString || discountCodesString === '') {
        return [];
      }
      
      return discountCodesString
        .split(',')
        .map(code => code.trim())
        .filter(code => code !== '');
    }

    setupEventListeners() {
      this.addEventListeners();
    }

    addEventListeners() {
      if (this.elements.applyButton) {
        this.elements.applyButton.addEventListener('click', this.boundHandlePromoCodeApply);
      }

      if (this.elements.removeButtons) {
        this.elements.removeButtons.forEach(button => {
          button.addEventListener('click', this.boundHandleRemovePromoCode);
        });
      }

      if (this.elements.input) {
        this.elements.input.addEventListener('keypress', this.boundHandleKeyPress);
      }
    }

    cleanupEventListeners() {
      if (this.elements.applyButton) {
        this.elements.applyButton.removeEventListener('click', this.boundHandlePromoCodeApply);
      }

      if (this.elements.removeButtons) {
        this.elements.removeButtons.forEach(button => {
          button.removeEventListener('click', this.boundHandleRemovePromoCode);
        });
      }

      if (this.elements.input) {
        this.elements.input.removeEventListener('keypress', this.boundHandleKeyPress);
      }
    }
    
    handleKeyPress(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handlePromoCodeApply();
      }
    }

    handlePromoCodeApply() {
      const promoCode = this.getInputValue();
      this.logDebug('Apply promo code requested', { promoCode });
      
      if (this.validatePromoCode(promoCode)) {
        this.applyPromoCode(promoCode);
      }
    }

    handleRemovePromoCode(event) {
      const promoCode = event.target.closest('.js-promo-code-remove')?.dataset.promoCode;
      if (promoCode) {
        this.logDebug('Remove promo code requested', { promoCode });
        this.removePromoCode(promoCode);
      }
    }
    
    validatePromoCode(promoCode) {
      const validationResult = this.performValidation(promoCode);
      
      if (!validationResult.isValid) {
        this.showError(validationResult.errorMessage);
        this.logDebug('Validation failed', { promoCode, reason: validationResult.errorMessage });
        return false;
      }

      this.clearError();
      this.logDebug('Validation passed', { promoCode });
      return true;
    }

    performValidation(promoCode) {
      if (this.isEmpty(promoCode)) {
        return {
          isValid: false,
          errorMessage: this.strings.empty || 'Please enter a promo code'
        };
      }

      if (this.isAlreadyApplied(promoCode)) {
        return {
          isValid: false,
          errorMessage: this.strings.already_applied || 'Promo code already applied'
        };
      }

      return { isValid: true };
    }

    isEmpty(promoCode) {
      return !promoCode || promoCode.trim() === '';
    }

    isAlreadyApplied(promoCode) {
      return this.discountCodes.includes(promoCode);
    }
    
    applyPromoCode(promoCode) {
      this.addToDiscountCodes(promoCode);
      this.updateCartDiscounts();
    }

    removePromoCode(promoCode) {
      this.removeFromDiscountCodes(promoCode);
      this.updateCartDiscounts();
    }

    addToDiscountCodes(promoCode) {
      if (!this.discountCodes.includes(promoCode)) {
        this.discountCodes.push(promoCode);
        this.logDebug('Added to discount codes', { promoCode, allCodes: this.discountCodes });
      }
    }

    removeFromDiscountCodes(promoCode) {
      this.discountCodes = this.discountCodes.filter(code => code !== promoCode);
      this.logDebug('Removed from discount codes', { promoCode, allCodes: this.discountCodes });
    }
    
    async updateCartDiscounts() {
      try {
        this.setLoadingState(true);
        this.logDebug('Updating cart discounts', { discountCodes: this.discountCodes });
        
        const formData = this.createFormData();
        const response = await this.sendCartUpdateRequest(formData);
        
        await this.handleCartUpdateResponse(response);
      } catch (error) {
        this.handleApiError(error);
      } finally {
        this.setLoadingState(false);
      }
    }

    createFormData() {
      const formData = new FormData();
      const discountString = this.discountCodes.join(',');
      formData.append('discount', discountString);
      return formData;
    }

    async sendCartUpdateRequest(formData) {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Cart update failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    }

    async handleCartUpdateResponse(data) {
      this.logDebug('Cart update response received', { data });
      
      const appliedCode = this.findAppliedCode(data);
      
      if (appliedCode) {
        if (appliedCode.applicable) {
          this.handleSuccessfulApplication();
        } else {
          this.showError(this.strings.not_applicable || 'This promo code is not applicable');
          return;
        }
      }

      // Dispatch custom event to notify cart section to refresh
      this.dispatchCartUpdateEvent();
    }

    findAppliedCode(data) {
      if (!data.discount_codes || !data.discount_codes.length) {
        return null;
      }

      const inputValue = this.getInputValue();
      return data.discount_codes.find(code => 
        code.code.toLowerCase() === inputValue.toLowerCase()
      );
    }

    handleSuccessfulApplication() {
      this.logDebug('Promo code applied successfully');
      this.clearInput();
      this.clearError();
    }

    handleApiError(error) {
      this.logDebug('API error occurred', { error: error.message });
      console.error('CartPromoCode API Error:', error);
      this.showError(this.strings.error || 'An error occurred while applying the promo code');
    }
    
    setLoadingState(isLoading) {
      if (this.elements.applyButton) {
        this.elements.applyButton.disabled = isLoading;
        this.elements.applyButton.textContent = isLoading 
          ? (this.strings.loading || 'Applying...')
          : (this.strings.button || 'Apply');
      }
    }

    showError(message) {
      if (this.elements.inputWrapper) {
        this.elements.inputWrapper.classList.add('error');
      }
      
      if (this.elements.errorDisplay) {
        this.elements.errorDisplay.textContent = message;
      }
    }

    clearError() {
      if (this.elements.inputWrapper) {
        this.elements.inputWrapper.classList.remove('error');
      }
      
      if (this.elements.errorDisplay) {
        this.elements.errorDisplay.textContent = '';
      }
    }

    clearInput() {
      if (this.elements.input) {
        this.elements.input.value = '';
      }
    }

    getInputValue() {
      return this.elements.input?.value?.trim() || '';
    }
    
    dispatchCartUpdateEvent() {
      const event = new CustomEvent('cart-promo-code:updated', {
        detail: {
          discountCodes: this.discountCodes,
          sectionId: this.dataset.sectionId
        },
        bubbles: true
      });
      
      this.logDebug('Dispatching cart update event', { 
        discountCodes: this.discountCodes, 
        sectionId: this.dataset.sectionId 
      });
      
      this.dispatchEvent(event);
    }
    
    logDebug(message, data = null) {
      if (!this.debugMode) return;
      
      const prefix = '[CartPromoCode]';
      
      if (data) {
        console.log(`${prefix} ${message}:`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  customElements.define(cartPromoCodeElement, CartPromoCode);
} 