import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface PhotoItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
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
  setId: string = '';
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
    const rawId = this.route.snapshot.paramMap.get('id') || '';
    this.setId = decodeURIComponent(rawId).trim();
    
    if (this.setId) {
      this.loadAlbumPhotos(this.setId);
    }
  }

  loadAlbumPhotos(setId: string): void {
    this.isLoading = true;
    this.http.get<any>(`${this.baseUrl}/photos?pageSize=100`)
      .subscribe({
        next: (response) => {
          let photosArray: PhotoItem[] = [];
          if (Array.isArray(response)) {
            photosArray = response;
          } else if (response && Array.isArray(response.items)) {
            photosArray = response.items;
          }

          const targetId = setId.toLowerCase().trim();

          this.albumPhotos = photosArray.filter(p => {
            if (!p.category) return false;
            return p.category.toLowerCase().trim() === targetId;
          }).map(p => {
            if (p.description && p.description.includes('Автозагрузка сканером')) {
              return { ...p, description: p.description.replace(/Автозагрузка сканером/gi, '').trim() };
            }
            return p;
          });

          this.currentPhotoIndex = 0;
          this.isLoading = false;
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
      img.src = url.startsWith('http') ? url : this.baseUrl + url;
    });
  }

  goBackToCategory(): void {
    const currentId = this.setId.toLowerCase();
    let parentCat = 'art-shoots';

    if (currentId.startsWith('reportage')) {
      parentCat = 'reportage';
    } else if (currentId.startsWith('commercial')) {
      parentCat = 'commercial';
    }

    this.router.navigate(['/category', parentCat]);
  }

  getCleanAlbumTitle(): string {
    return this.setId
      .replace(/art-shoots-/i, '')
      .replace(/reportage-/i, '')
      .replace(/commercial-/i, '')
      .replace(/-/g, ' ')
      .toUpperCase();
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
      event.preventDefault(); // Предотвращаем скролл страницы
      element.scrollBy({ left: event.deltaY < 0 ? -200 : 200, behavior: 'smooth' });
    }
  }
}