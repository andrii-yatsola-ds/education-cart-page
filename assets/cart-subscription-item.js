const cartSubscriptionItem = 'cart-subscription-item';

if (!customElements.get(cartSubscriptionItem)) {
  class CartSubscriptionItemComponent extends HTMLElement {
    constructor() {
      super();
      this.select = this.querySelector('.js-selling-plan');
    }

    connectedCallback() {
      this.init();
    }

    disconnectedCallback() {
      this.select?.removeEventListener('change', this.updateSellingPlan.bind(this));
    }

    init() {
      this.select?.addEventListener('change', this.updateSellingPlan.bind(this));
    }

    setBodyData() {
      return {
        id: this.select.dataset.key,
        quantity: this.select.dataset.quantity,
        selling_plan: this.select.value === "" ? null : this.select.value,
      }
    }

    updateSellingPlan(){
      if (!this.select) {
        return;
      }

      publish('cart-subscription-item-change:start', { line: this.select.dataset.line });

      const data = this.setBodyData();
  
      fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then((response) => {
        return response.text();
      })
      .then(state => {
        const parsedState = JSON.parse(state);
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-subscription-item', cartData: parsedState });
      })
      .finally(() => {
        publish('cart-subscription-item-change:end', { line: this.select.dataset.line });
      })
      .catch((error) => {
        console.error('Error:', error);
        publish('cart-subscription-item-change:end', { line: this.select.dataset.line });
      });
    }
  }

  customElements.define(cartSubscriptionItem, CartSubscriptionItemComponent);
}