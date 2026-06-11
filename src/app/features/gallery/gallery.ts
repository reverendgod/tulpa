import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // Импортируем Router

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.css']
})
export class GalleryComponent implements AfterViewInit, OnDestroy {
  // Базовый URL бэкенда для картинок, если понадобится в шаблоне
  readonly baseUrl = '/api';

  // Получаем ссылки на все элементы с #revealCard для плавного появления
  @ViewChildren('revealCard') revealCards!: QueryList<ElementRef>;
  private observer: IntersectionObserver | null = null;

  // Внедряем Роутер через конструктор, чтобы переходы наконец-то заработали!
  constructor(private router: Router) {}

  ngAfterViewInit() {
    // Настраиваем IntersectionObserver для появления при скролле
    this.observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(e => e.isIntersecting);
      
      // Добавляем плавную задержку, если несколько карточек появляются одновременно
      visibleEntries.forEach((entry, index) => {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 150); // каскадная задержка
        
        // Прекращаем следить, чтобы анимация проигралась один раз
        this.observer?.unobserve(entry.target);
      });
    }, { 
      threshold: 0.15, // Появляется, когда видно 15% элемента
      rootMargin: "0px 0px -50px 0px" // Небольшой отступ от нижнего края окна
    });

    this.revealCards.forEach(card => {
      this.observer?.observe(card.nativeElement);
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  // Метод, который вызывается при клике на баннер в gallery.html
  openCategory(mainCat: string): void {
    // Насмерть перенаправляем Angular по адресу /category/art-shoots, /category/reportage и т.д.
    this.router.navigate(['/category', mainCat]);
  }
}