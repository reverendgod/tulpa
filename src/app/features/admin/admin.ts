import { Component, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

interface AlbumItem {
  id: string;
  name: string;
}

interface UploadItem {
  file: File;
  previewUrl: string; 
  title: string;      
  description: string; 
}

interface PhotoItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  isMain: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  readonly baseUrl = '/api';
  
  loading = signal<boolean>(false);
  feedbacks = signal<any[]>([]); 
  
  uploadQueueCreate: UploadItem[] = []; 
  uploadQueueAppend: UploadItem[] = []; 
  mainPhotoIndexCreate: number = 0; // Индекс главной фотографии при создании альбома
  newAlbumCategory: string = 'art-shoots';
  newAlbumName: string = '';

  albums: AlbumItem[] = [];
  selectedAlbumId: string = '';
  renameAlbumName: string = '';
  albumPhotos: PhotoItem[] = []; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAlbums();
    this.loadFeedbacks();
  }

  loadAlbums(): void {
    this.http.get<string[]>(`${this.baseUrl}/photos/albums`)
      .subscribe({
        next: (folders) => {
          // ИСПРАВЛЕНО: чистим ID от возможных лишних пробелов или путей, которые мог вернуть C#
          const excludedAlbums = ['reportage', 'art-shoots', 'commercial'];
          this.albums = folders
            .map(f => f.trim())
            .filter(id => !excludedAlbums.includes(id))
            .map(cleanId => {
              return {
                id: cleanId,
                name: cleanId.replace(/-/g, ' ').toUpperCase()
              };
            });
        },
        error: (err) => console.error('Ошибка загрузки альбомов:', err)
      });
  }

  onFilesSelected(event: any, mode: 'create' | 'append'): void {
    const files: FileList = event.target.files;
    const queue: UploadItem[] = [];

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        queue.push({
          file: file,
          previewUrl: URL.createObjectURL(file), 
          title: '',
          description: ''
        });
      }
    }

    if (mode === 'create') {
      this.uploadQueueCreate = queue;
      this.mainPhotoIndexCreate = 0; // Сбрасываем при новом выборе
    } else {
      this.uploadQueueAppend = queue;
    }
  }

  onAlbumSelectChange(): void {
    const found = this.albums.find(a => a.id === this.selectedAlbumId);
    if (found) {
      this.renameAlbumName = found.name;
      this.loadAlbumPhotos(this.selectedAlbumId); 
      this.uploadQueueAppend = [];
    } else {
      this.renameAlbumName = '';
      this.albumPhotos = [];
      this.uploadQueueAppend = [];
    }
  }

  loadAlbumPhotos(albumId: string): void {
    this.http.get<PhotoItem[]>(`${this.baseUrl}/photos?category=${encodeURIComponent(albumId)}`)
      .subscribe({
        next: (photos) => {
          this.albumPhotos = photos;
        },
        error: (err) => {
          console.error('Ошибка загрузки фото альбома:', err);
          this.albumPhotos = [];
        }
      });
  }

  uploadBulk(mode: 'create' | 'append', fileInput: HTMLInputElement): void {
    let targetAlbumId = '';
    let currentQueue: UploadItem[] = [];

    if (mode === 'create') {
      if (!this.newAlbumName.trim()) {
        alert('Введите название для нового альбома!');
        return;
      }
      const slugName = this.newAlbumName.trim().toLowerCase().replace(/\s+/g, '-');
      targetAlbumId = `${this.newAlbumCategory}-${slugName}`;
      currentQueue = this.uploadQueueCreate;
    } else {
      if (!this.selectedAlbumId) {
        alert('Альбом для загрузки не выбран!');
        return;
      }
      targetAlbumId = this.selectedAlbumId;
      currentQueue = this.uploadQueueAppend;
    }

    if (currentQueue.length === 0) {
      alert('Выберите хотя бы одну фотографию!');
      return;
    }

    this.loading.set(true);

    const requests = currentQueue.map(item => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('title', item.title || 'Без названия');
      formData.append('description', item.description || ''); 
      formData.append('albumId', targetAlbumId.trim()); // ИСПРАВЛЕНО: убираем случайные пробелы в ID
      
      // Выводим в консоль для отладки у неё на ПК
      console.log(`Отправка файла на: ${this.baseUrl}/photos/upload, AlbumID: ${targetAlbumId.trim()}`);
      
      return this.http.post<PhotoItem>(`${this.baseUrl}/photos/upload`, formData);
    });

    forkJoin(requests).subscribe({
      next: (responses) => {
        if (mode === 'create' && responses.length > 0) {
          const mainPhoto = responses[this.mainPhotoIndexCreate];
          if (mainPhoto && mainPhoto.id) {
            // Назначаем главную фотографию
            this.http.post(`${this.baseUrl}/photos/set-main/${mainPhoto.id}`, {}).subscribe();
          }
        }
        
        alert(`Успешно загружено кадров: ${currentQueue.length} шт.`);
        this.loading.set(false);
        fileInput.value = '';
        if (mode === 'create') {
          this.uploadQueueCreate = [];
          this.newAlbumName = '';
          this.loadAlbums();
        } else {
          this.uploadQueueAppend = [];
          this.loadAlbumPhotos(this.selectedAlbumId); 
        }
      },
      error: (err) => {
        console.error('Критическая ошибка при forkJoin загрузке:', err);
        this.loading.set(false);
        // ИСПРАВЛЕНО: Выводим подробности ошибки прямо в alert, чтобы она могла сказать тебе точный статус
        alert(`Ошибка при загрузке. Статус: ${err.status}. Сообщение: ${err.message}`);
      }
    });
  }

  renameAlbum(): void {
    if (!this.selectedAlbumId || !this.renameAlbumName.trim()) return;
    this.http.post(`${this.baseUrl}/photos/album/rename`, { 
      oldAlbumId: this.selectedAlbumId.trim(), 
      newAlbumName: this.renameAlbumName.trim() 
    })
    .subscribe({
      next: () => {
        alert('Альбом успешно переименован!');
        this.selectedAlbumId = '';
        this.renameAlbumName = '';
        this.albumPhotos = [];
        this.loadAlbums();
      },
      error: (err) => console.error('Ошибка изменения папки:', err)
    });
  }

  deleteAlbum(): void {
    if (!this.selectedAlbumId) return;
    const confirmDelete = confirm(`Вы уверены, что хотите НАВСЕГДА удалить альбом "${this.selectedAlbumId}"?`);
    if (!confirmDelete) return;

    this.http.delete(`${this.baseUrl}/photos/album/delete/${encodeURIComponent(this.selectedAlbumId.trim())}`)
      .subscribe({
        // ИСПРАВЛЕНО: было 'root', должно быть 'next'
        next: () => {
          alert('Альбом удален.');
          this.selectedAlbumId = '';
          this.renameAlbumName = '';
          this.albumPhotos = [];
          this.loadAlbums();
        },
        error: (err) => console.error(err)
      });
  }

  deletePhoto(photoId: number): void {
    const confirmDelete = confirm('Удалить эту фотографию из альбома?');
    if (!confirmDelete) return;

    this.http.delete(`${this.baseUrl}/photos/delete/${photoId}`)
      .subscribe({
        next: () => {
          this.albumPhotos = this.albumPhotos.filter(p => p.id !== photoId);
        },
        error: (err) => console.error(err)
      });
  }

  updatePhotoMetadata(photo: PhotoItem): void {
    this.http.put(`${this.baseUrl}/photos/update/${photo.id}`, {
      title: photo.title,
      description: photo.description
    })
    .subscribe({
      next: () => alert('Метаданные обновлены!'),
      error: (err) => console.error(err)
    });
  }

  setAsMainPhoto(photo: PhotoItem): void {
    this.http.post(`${this.baseUrl}/photos/set-main/${photo.id}`, {})
      .subscribe({
        next: () => {
          alert('Этот кадр успешно назначен главной обложкой альбома!');
          this.loadAlbumPhotos(this.selectedAlbumId); 
        },
        error: (err) => {
          console.error(err);
          alert('Не удалось назначить обложку.');
        }
      });
  }

  loadFeedbacks(): void {
    this.http.get<any[]>(`${this.baseUrl}/feedbacks`)
      .subscribe({
        next: (data) => this.feedbacks.set(data),
        error: (err) => console.log(err)
      });
  }

  deleteFeedback(id: number): void {
    const confirmDelete = confirm('Удалить эту заявку?');
    if (!confirmDelete) return;

    this.http.delete(`${this.baseUrl}/feedbacks/${id}`)
      .subscribe({
        next: () => {
          this.feedbacks.update(f => f.filter(item => item.id !== id));
        },
        error: (err) => {
          console.error('Ошибка при удалении заявки:', err);
          // Оптимистичное удаление для UI
          this.feedbacks.update(f => f.filter(item => item.id !== id));
        }
      });
  }

  toggleFeedbackRead(feedback: any): void {
    const newState = !feedback.isRead;
    
    this.http.patch(`${this.baseUrl}/feedbacks/${feedback.id}/read`, { isRead: newState })
      .subscribe({
        next: () => {
          this.feedbacks.update(f => f.map(item => item.id === feedback.id ? { ...item, isRead: newState } : item));
        },
        error: (err) => {
          console.error('Ошибка при обновлении статуса заявки:', err);
          // Оптимистичное обновление для UI
          this.feedbacks.update(f => f.map(item => item.id === feedback.id ? { ...item, isRead: newState } : item));
        }
      });
  }
}