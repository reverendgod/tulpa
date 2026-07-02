import { Component, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

interface AlbumItem {
  id: number;          
  name: string;
  slug: string;        
  categorySlug: string; 
  categoryName: string; 
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
  albumId: number;     
  isMain: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  readonly baseUrl = '/api';
  
  loading = signal<boolean>(false);
  feedbacks = signal<any[]>([]); 
  
  uploadQueueCreate: UploadItem[] = []; 
  uploadQueueAppend: UploadItem[] = []; 
  mainPhotoIndexCreate: number = 0; 
  newAlbumCategory: string = 'art-shoots';
  newAlbumName: string = '';

  albums: AlbumItem[] = [];
  selectedAlbumId: number | '' = ''; 
  renameAlbumName: string = '';
  albumPhotos: PhotoItem[] = []; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAlbums();
    this.loadFeedbacks();
  }

  loadAlbums(): void {
    this.http.get<AlbumItem[]>(`${this.baseUrl}/photos/albums`)
      .subscribe({
        next: (data) => {
          this.albums = data;
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
      this.mainPhotoIndexCreate = 0;
    } else {
      this.uploadQueueAppend = queue;
    }
  }

  onAlbumSelectChange(): void {
    if (this.selectedAlbumId !== '') {
      const found = this.albums.find(a => a.id === Number(this.selectedAlbumId));
      if (found) {
        this.renameAlbumName = found.name;
        this.loadAlbumPhotos(Number(this.selectedAlbumId)); 
        this.uploadQueueAppend = [];
      }
    } else {
      this.renameAlbumName = '';
      this.albumPhotos = [];
      this.uploadQueueAppend = [];
    }
  }

  loadAlbumPhotos(albumId: number): void {
    this.albumPhotos = []; 

    this.http.get<PhotoItem[]>(`${this.baseUrl}/photos?albumId=${albumId}`)
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

  trackByPhotoId(index: number, item: PhotoItem): number {
    return item.id;
  }

  uploadBulk(mode: 'create' | 'append', fileInput: HTMLInputElement): void {
    if (mode === 'create') {
      if (!this.newAlbumName.trim()) {
        alert('Введите название для нового альбома!');
        return;
      }
      if (this.uploadQueueCreate.length === 0) {
        alert('Выберите фотографии для нового альбома!');
        return;
      }

      this.loading.set(true);

      let catId = 1; // 'art'
      if (this.newAlbumCategory === 'commercial') catId = 2;
      if (this.newAlbumCategory === 'reportage') catId = 3;

      const albumDto = {
        name: this.newAlbumName.trim(),
        categoryId: catId 
      };

      this.http.post<AlbumItem>(`${this.baseUrl}/photos/album/create`, albumDto)
        .subscribe({
          next: (createdAlbum) => {
            this.executePhotosUpload(createdAlbum.id, this.uploadQueueCreate, mode, fileInput);
          },
          error: (err) => {
            console.error('Ошибка создания альбома:', err);
            this.loading.set(false);
            alert(`Не удалось создать альбом. Статус: ${err.status}`);
          }
        });
    } else {
      this.loading.set(true);
      this.executePhotosUpload(Number(this.selectedAlbumId), this.uploadQueueAppend, mode, fileInput);
    }
  }

  private executePhotosUpload(albumId: number, queue: UploadItem[], mode: 'create' | 'append', fileInput: HTMLInputElement): void {
    const requests = queue.map(item => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('title', item.title || 'Без названия');
      formData.append('description', item.description || ''); 
      formData.append('albumId', albumId.toString()); 
      
      return this.http.post<PhotoItem>(`${this.baseUrl}/photos/upload`, formData);
    });

    forkJoin(requests).subscribe({
      next: (responses) => {
        if (mode === 'create' && responses.length > 0) {
          const mainPhoto = responses[this.mainPhotoIndexCreate];
          if (mainPhoto && mainPhoto.id) {
            this.http.post(`${this.baseUrl}/photos/set-main/${mainPhoto.id}`, {}).subscribe();
          }
        }
        
        alert(`Успешно загружено кадров: ${queue.length} шт.`);
        this.loading.set(false);
        fileInput.value = '';
        
        if (mode === 'create') {
          this.uploadQueueCreate = [];
          this.newAlbumName = '';
          this.loadAlbums();
        } else {
          this.uploadQueueAppend = [];
          this.loadAlbumPhotos(albumId); 
        }
      },
      error: (err) => {
        console.error('Критическая ошибка при загрузке картинок:', err);
        this.loading.set(false);
        alert(`Ошибка при загрузке изображений. Статус: ${err.status}.`);
      }
    });
  }

  dropPhotos(event: CdkDragDrop<PhotoItem[]>) {
    if (this.albumPhotos) {
      moveItemInArray(this.albumPhotos, event.previousIndex, event.currentIndex);
    }
  }

  renameAlbum(): void {
    if (this.selectedAlbumId === '' || !this.renameAlbumName.trim()) return;
    
    const dto = {
      albumId: Number(this.selectedAlbumId),
      newAlbumName: this.renameAlbumName.trim()
    };

    this.http.post(`${this.baseUrl}/photos/album/rename`, dto)
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
    if (this.selectedAlbumId === '') return;
    const confirmDelete = confirm(`Вы уверены, что хотите НАВСЕГДА удалить этот альбом?`);
    if (!confirmDelete) return;

    this.http.delete(`${this.baseUrl}/photos/album/delete/${this.selectedAlbumId}`)
      .subscribe({
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
          if (this.selectedAlbumId !== '') {
            this.loadAlbumPhotos(Number(this.selectedAlbumId)); 
          }
        },
        error: (err) => {
          console.error(err);
          alert('Не удалось назначить обложку.');
        }
      });
  }

  savePhotosOrder(): void {
    if (this.selectedAlbumId === '' || this.albumPhotos.length === 0) {
      alert('Нет данных для сохранения порядка.');
      return;
    }

    const photoIds = this.albumPhotos.map(p => p.id);

    const dto = {
      albumId: Number(this.selectedAlbumId),
      photoIds: photoIds
    };

    // ИСПРАВЛЕНО: Изменен роут на корректный и метод на http.post для совместимости с контроллером
    this.http.post(`${this.baseUrl}/photos/reorder`, dto)
      .subscribe({
        next: (res: any) => {
          alert('Порядок фотографий успешно сохранен!');
        },
        error: (err) => {
          console.error('Ошибка сохранения порядка:', err);
          alert(`Не удалось сохранить порядок. Статус: ${err.status}`);
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
          this.feedbacks.update(f => f.map(item => item.id === feedback.id ? { ...item, isRead: newState } : item));
        }
      });
  }
}