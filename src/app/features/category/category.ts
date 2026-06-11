import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <-- 1. Добавили ChangeDetectorRef
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface PhotoItem {
  id: number;
  imageUrl: string;
  category: string;
  isMain: boolean;
}

interface SetItem {
  id: string;
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
    private cdr: ChangeDetectorRef // <-- 2. Внедряем в конструктор
  ) {}

  ngOnInit(): void {
    this.mainCategoryName = this.route.snapshot.paramMap.get('id') || '';
    if (this.mainCategoryName) {
      this.loadCategorySets(this.mainCategoryName);
    }
  }

 loadCategorySets(mainCat: string): void {
    const targetCat = mainCat.toLowerCase().trim();

    this.http.get<any>(`${this.baseUrl}/photos?pageSize=500`)
      .subscribe({
        next: (response) => {
          let photosArray: PhotoItem[] = [];
          if (Array.isArray(response)) {
            photosArray = response;
          } else if (response && Array.isArray(response.items)) {
            photosArray = response.items;
          }

          // ДИНАМИЧЕСКИЙ ОТБОР СЕТОВ (Исключаем старый плоский хлам)
          const filtered = photosArray.filter(p => {
            if (!p.category) return false;
            const dbCat = p.category.toLowerCase().trim();
            
            // Забираем только те сеты, которые начинаются с текущего раздела 
            // И строго содержат дефис (гарантия того, что это вложенная папка-сет, а не общая категория)
            return dbCat.startsWith(targetCat) && dbCat.includes('-');
          });

          // Собираем уникальные категории/сеты
          const uniqueSetIds = Array.from(new Set(filtered.map(p => p.category)));

          // Группируем папки автоматически
          this.sets = uniqueSetIds.map(setId => {
            const setPhotos = filtered.filter(p => p.category === setId);
            const cover = setPhotos.find(p => p.isMain) || setPhotos[0];
            
            // Автоматически вырезаем технические префиксы папок (art-shoots-лиза -> ЛИЗА)
            const dName = setId
              .replace(new RegExp('^' + mainCat + '-', 'i'), '')
              .replace(new RegExp('^' + mainCat, 'i'), '')
              .replace(/-/g, ' ')
              .trim();

            return {
              id: setId, 
              displayName: dName.toUpperCase(), 
              coverUrl: cover ? cover.imageUrl : ''
            };
          });

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Ошибка загрузки альбомов:', err)
      });
  }

  openSet(setId: string): void {
    this.router.navigate(['/album', setId]);
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