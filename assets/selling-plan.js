const sellingPlan = 'selling-plan';

if (!customElements.get(sellingPlan)) {
  class SellingPlan extends HTMLElement {
    constructor() {
      super();

      this.sellingPlanInput = this.querySelector('.js-selling-plan');
      this.radioButtons = this.querySelectorAll('.js-selling-plan-radio');
      this.sellingPlanSelect = this.querySelector('.js-selling-plan-select');
      this.sellingPlanDiscountPrice = this.querySelector('.js-selling-plan-discount-price');
    }

    connectedCallback() {
      this.init();
    }

    disconnectedCallback() {
      this.radioButtons?.forEach(radio => {
        radio.removeEventListener('change', this.updateSellingPlanInput.bind(this));
      });

      this.sellingPlanSelect.removeEventListener('change', this.updateSellingPlanInput.bind(this));
    }

    init() {
      this.bindEvents();
      this.updateSellingPlanInput();
    }

    bindEvents() {
      this.radioButtons?.forEach(radio => {
        radio.addEventListener('change', this.updateSellingPlanInput.bind(this));
      });

      this.sellingPlanSelect?.addEventListener('change', this.updateSellingPlanInput.bind(this));
    }

    updateSellingPlanInput() {
      if (!this.sellingPlanInput) return;

      const checkedRadio = this.querySelector('.js-selling-plan-radio:checked');
      
      if (!checkedRadio) return;

      if (checkedRadio.value === 'onetime') {
        this.sellingPlanInput.value = '';
      } else if (checkedRadio.value === 'subscribe') {
        this.sellingPlanInput.value = this.sellingPlanSelect.value;
        this.sellingPlanDiscountPrice.innerText = this.sellingPlanSelect.querySelector('option:checked').dataset.price;
      }
    }
  }

  customElements.define(sellingPlan, SellingPlan);
}