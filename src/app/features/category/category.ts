import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface AlbumItem {
  id: number;
  name: string;
  slug: string;
  category: string;
}

interface SetItem {
  id: number;       // Теперь ID числовой
  displayName: string;
  coverUrl: string;
}

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './category.html',
  styleUrls: ['./category.css']
})
export class CategoryComponent implements OnInit {
  readonly baseUrl = '/api';
  mainCategoryName: string = '';
  sets: SetItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.mainCategoryName = this.route.snapshot.paramMap.get('id') || '';
    if (this.mainCategoryName) {
      this.loadCategorySets(this.mainCategoryName);
    }
  }
  
loadCategorySets(mainCat: string): void {
  const targetCat = mainCat.toLowerCase().trim();

  this.http.get<any[]>(`${this.baseUrl}/photos/albums?category=${targetCat}`)
    .subscribe({
      next: (albums) => {
        this.sets = albums.map(album => {
          return {
            id: album.id,
            displayName: album.name.toUpperCase(), 
            coverUrl: album.coverUrl // <-- ИСПРАВЛЕНО: Просто берем готовую обложку, переданную сервером!
          };
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Ошибка загрузки альбомов:', err)
    });
}

  openSet(albumId: number): void {
    // Передаем числовой ID в роутер
    this.router.navigate(['/album', albumId]);
  }

  goBackToGallery(): void {
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        const el = document.getElementById('works');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });
  }

  getReadableHeader(): string {
    if (this.mainCategoryName === 'art-shoots') return 'ХУДОЖЕСТВЕННАЯ СЪЁМКА';
    if (this.mainCategoryName === 'reportage') return 'РЕПОРТАЖНАЯ СЪЁМКА';
    if (this.mainCategoryName === 'commercial') return 'ПРЕДМЕТНАЯ СЪЁМКА';
    return this.mainCategoryName.toUpperCase();
  }
}