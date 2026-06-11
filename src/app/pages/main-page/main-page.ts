import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Импортируем блоки лендинга с точными путями:
import { HeroComponent } from '../../features/hero/hero'; 
import { GalleryComponent } from '../../features/gallery/gallery';
import { StoryComponent } from '../../features/story/story'; 

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    HeroComponent, 
    GalleryComponent, 
    StoryComponent, 
  ],
  templateUrl: './main-page.html',
  styleUrls: ['./main-page.css']
})
export class MainPageComponent {
  scrollTo(elementId: string, event: Event): void {
    event.preventDefault(); // Предотвращаем стандартный резкий прыжок браузера
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}