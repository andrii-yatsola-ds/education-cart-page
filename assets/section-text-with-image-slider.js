if (!customElements.get("s-text-with-image-slider")) {
  customElements.define( "s-text-with-image-slider", class SectionTextWithImageSlider extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.mainSliderElement = this.querySelector('.js-text-with-image-slider__slider');
        this.textBlockWrapper = this.querySelector('.js-text-with-image-slider__block-titles');
        this.arrowPrev = this.querySelector('.js-arrow-prev');
        this.arrowNext = this.querySelectorAll('.js-arrow-next');
        this.tabs = this.querySelectorAll('.js-text-with-image-slider__block-title');

        this.draggable = this.dataset.draggable === 'true' ? true : false;
        this.autoplay = this.dataset.autoplay === 'true' ? true : false;
        this.autoplaySpeed = Number(this.dataset.autoplaySpeed);

        this.tabs.forEach(tab => {
          tab.addEventListener('click', this.changeSlideHandler)
        })
        this.arrowPrev.addEventListener('click', this.prevArrowHandler);
        this.arrowNext.forEach(arrow => {
          arrow.addEventListener('click', this.nextArrowHandler);
        })
        this.initSlider();
      }

      disconnectedCallback() {
        this.tabs.forEach(tab => {
          tab.removeEventListener('click', this.changeSlideHandler);
        })
      }

      initSlider = () => {
        const params = {
          cellAlign: 'center',
          cellSelector: '.js-text-with-image-slider__slide-wrapper',
          prevNextButtons: false,
          pageDots: false,
          draggable: this.draggable
        }

        if(this.autoplay){
          params.autoPlay = this.autoplaySpeed;
        }

        this.slider = new Flickity(this.mainSliderElement, params);
        
        this.slider.on('change', (index) => {
          this.setActiveTab(index);
          this.arrowsVisibilityHandler();
        });

        this.arrowsVisibilityHandler();
      }

      changeSlideHandler = (event) => {
        const clickedElement = event.target.closest('.js-text-with-image-slider__block-title');
        const tabIndex = clickedElement.dataset.slideIndex;
        
        this.slider?.select(tabIndex);
      }

      setActiveTab = (index) => {
        this.tabs.forEach((tab) => {
          const tabIndex = Number(tab.dataset.slideIndex);
          const isActive = tabIndex === index;
      
          tab.classList.toggle('is-active', isActive);
      
          if (isActive) {
            this.changeBackgroundColor(tab);
          }
        });
      }
      
      changeBackgroundColor = (tab) => {
        const backgroundColor = tab.dataset.blockBgColor;
        this.textBlockWrapper.style.backgroundColor = backgroundColor;
      }

      prevArrowHandler = () => {
        if (this.slider) {
          this.slider.previous(false, false);
          this.arrowsVisibilityHandler();
        }
      };
      
      nextArrowHandler = () => {
        if (this.slider) {
          this.slider.next(false, false);
          this.arrowsVisibilityHandler();
        }
      };

      arrowsVisibilityHandler = () => {
        if (!this.slider || !this.slider.cells.length) return;
      
        const selectedIndex = this.slider.selectedIndex;
        const lastIndex = this.slider.slides.length - 1;
        
        this.arrowPrev?.classList.toggle("is-disabled", selectedIndex === 0);
        this.arrowNext?.forEach(arrow => {
          arrow.classList.toggle("is-disabled", selectedIndex === lastIndex);
        })
      };
    }
  );
}