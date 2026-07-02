import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface PhotoItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  albumId: number;    // Заменили category на albumId
  isMain: boolean;
}

@Component({
  selector: 'app-album',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './album.html',
  styleUrls: ['./album.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumComponent implements OnInit {
  readonly baseUrl = '/api';
  albumId: number = 0; // Теперь это числовой ID
  albumTitle: string = 'АЛЬБОМ';
  albumPhotos: PhotoItem[] = [];
  currentPhotoIndex: number = 0;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id') || '0';
    this.albumId = parseInt(rawId, 10);
    
    if (this.albumId) {
      this.loadAlbumPhotos(this.albumId);
    }
  }

  loadAlbumPhotos(id: number): void {
    this.isLoading = true;
    this.albumPhotos = [];

    // Запрашиваем у сервера фотографии строго по albumId
    this.http.get<PhotoItem[]>(`${this.baseUrl}/photos?albumId=${id}&pageSize=200`)
      .subscribe({
        next: (response) => {
          let photosArray: PhotoItem[] = Array.isArray(response) ? response : (response as any).items || [];

          this.albumPhotos = photosArray.map(p => {
            if (p.description && p.description.includes('Автозагрузка сканером')) {
              return { ...p, description: p.description.replace(/Автозагрузка сканером/gi, '').trim() };
            }
            return p;
          });

          this.currentPhotoIndex = 0;
          this.isLoading = false;
          
          // Получаем имя альбома для заглавия страницы
          this.getAlbumMetadata(id);
          this.preloadAdjacentImages();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Ошибка загрузки фотографий альбома:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private getAlbumMetadata(id: number): void {
    this.http.get<any[]>(`${this.baseUrl}/photos/albums`).subscribe(albums => {
      const currentAlbum = albums.find(a => a.id === id);
      if (currentAlbum) {
        this.albumTitle = currentAlbum.name.toUpperCase().replace(/-/g, ' ');
        this.cdr.detectChanges();
      }
    });
  }

  prevPhoto(event: Event): void {
    event.stopPropagation();
    if (this.albumPhotos.length === 0) return;
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.albumPhotos.length) % this.albumPhotos.length;
    this.preloadAdjacentImages();
  }

  nextPhoto(event: Event): void {
    event.stopPropagation();
    if (this.albumPhotos.length === 0) return;
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.albumPhotos.length;
    this.preloadAdjacentImages();
  }

  setPhoto(index: number): void {
    this.currentPhotoIndex = index;
    this.preloadAdjacentImages();
  }

  private preloadAdjacentImages(): void {
    if (this.albumPhotos.length <= 1) return;
    
    const nextIndex = (this.currentPhotoIndex + 1) % this.albumPhotos.length;
    const prevIndex = (this.currentPhotoIndex - 1 + this.albumPhotos.length) % this.albumPhotos.length;
    
    [nextIndex, prevIndex].forEach(idx => {
      const img = new Image();
      const url = this.albumPhotos[idx].imageUrl;
      img.src = url.startsWith('http') ? url : url;
    });
  }

  goBackToCategory(): void {
    // Определяем родительскую категорию для возврата
    this.http.get<any[]>(`${this.baseUrl}/photos/albums`).subscribe(albums => {
      const currentAlbum = albums.find(a => a.id === this.albumId);
    const parentCat = currentAlbum ? currentAlbum.categorySlug : 'art';
    this.router.navigate(['/category', parentCat]);
    });
  }

  getCleanAlbumTitle(): string {
    return this.albumTitle;
  }

  trackByPhotoId(index: number, item: PhotoItem): number {
    return item.id;
  }

  scrollThumbnails(direction: number, element: HTMLElement): void {
    if (element) {
      const scrollAmount = 300;
      element.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  }

  onWheelScroll(event: WheelEvent, element: HTMLElement): void {
    if (element) {
      event.preventDefault();
      element.scrollBy({ left: event.deltaY < 0 ? -200 : 200, behavior: 'smooth' });
    }
  }
}