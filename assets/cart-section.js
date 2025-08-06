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
      document.removeEventListener("liquid-ajax-cart:request-end", this.init.bind(this));
    }

    init() {
      this.setVariables();
    }

    setVariables() {
      this.cartForm = this.querySelector('.js-cart-form');
      this.contentWrapper = this.querySelector('.js-content-wrapper');
    }
  }
  customElements.define(cartElement, CartSection);
}
