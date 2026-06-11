import { Component } from '@angular/core';
import { HeroComponent } from '../hero/hero';
import { GalleryComponent } from '../gallery/gallery';
import { StoryComponent } from '../story/story';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, GalleryComponent, StoryComponent],
  template: `
    <app-hero />
    <app-gallery />
    <app-story />
  `
})
export class HomeComponent {}