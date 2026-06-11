import { Routes } from '@angular/router';
 
 export const routes: Routes = [
   { path: '', loadComponent: () => import('./pages/main-page/main-page').then(m => m.MainPageComponent) },
   { path: 'admin', loadComponent: () => import('./features/admin/admin').then(m => m.AdminComponent) },
   { path: 'gallery', loadComponent: () => import('./features/gallery/gallery').then(m => m.GalleryComponent) },
   { path: 'story', loadComponent: () => import('./features/story/story').then(m => m.StoryComponent) },
   { path: 'category/:id', loadComponent: () => import('./features/category/category').then(m => m.CategoryComponent) },
   { path: 'album/:id', loadComponent: () => import('./features/album/album').then(m => m.AlbumComponent) }
 ];