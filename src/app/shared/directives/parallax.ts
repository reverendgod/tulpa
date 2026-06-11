import { Directive, ElementRef, HostListener, Input, Renderer2, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appParallax]',
  standalone: true
})
export class ParallaxDirective implements OnDestroy {
  // Скорость движения: положительная — обгоняет скролл, отрицательная — отстает
  @Input() parallaxSpeed: number = 0; 
  private animationFrameId: number | null = null;
  private lastScrollY: number = 0;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.lastScrollY = window.scrollY;
    
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => this.updateParallax());
    }
  }

  private updateParallax() {
    const movement = this.lastScrollY * this.parallaxSpeed;
    
    // Безопасно трансформируем элемент через Renderer2 с использованием translate3d для аппаратного ускорения
    this.renderer.setStyle(
      this.el.nativeElement, 
      'transform', 
      `translate3d(0, ${movement}px, 0)`
    );
    
    this.animationFrameId = null;
  }

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}